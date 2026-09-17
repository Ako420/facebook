import { Group } from "../model/group.js";
import { GroupMember } from "../model/groupMember.js";
import { Post } from "../model/post.js";
import { PostView } from "../model/postView.js";
import { User } from "../model/user.js";
import { ApiError } from "../utils/apiError.js";
import { atomically, opts } from "../utils/transaction.js";
import { isValidObjectId } from "../utils/validators.js";
import { destroyMediaUrls } from "./uploadService.js";
import { notify, retract } from "./notificationService.js";

const MAX_QUERY = 100;

const same = (a, b) => String(a) === String(b);

const requireId = (id, label = "group") => {
  if (!isValidObjectId(id)) throw ApiError.badRequest(`Invalid ${label} id.`);
};


const inTx = (query, session) => (session ? query.session(session) : query);


const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


export const membershipOf = (groupId, userId, session) =>
  inTx(GroupMember.findOne({ groupId, userId }), session).lean();

export const activeMembershipOf = (groupId, userId, session) =>
  inTx(GroupMember.findOne({ groupId, userId, status: "active" }), session).lean();

const requireGroup = async (groupId) => {
  requireId(groupId);
  const group = await Group.findById(groupId);
  if (!group) throw ApiError.notFound("Group not found.");
  return group;
};

const requireMember = async (groupId, userId, session) => {
  const membership = await activeMembershipOf(groupId, userId, session);
  if (!membership) throw ApiError.forbidden("Only members of this group can do that.");
  return membership;
};

const requireAdmin = async (groupId, userId, session) => {
  const membership = await activeMembershipOf(groupId, userId, session);
  if (!membership || membership.role !== "admin") {
    throw ApiError.forbidden("Only a group admin can do that.");
  }
  return membership;
};

const requireReadable = async (group, userId) => {
  if (group.privacy === "public") return null;

  const membership = await activeMembershipOf(group._id, userId);
  if (!membership) {
    throw ApiError.forbidden("Join this group to see what is posted in it.");
  }
  return membership;
};

const countAdmins = (groupId, session) =>
  inTx(GroupMember.countDocuments({ groupId, role: "admin", status: "active" }), session);


const syncMemberCount = async (groupId, session) => {
  const count = await inTx(
    GroupMember.countDocuments({ groupId, status: "active" }),
    session,
  );
  await Group.updateOne({ _id: groupId }, { $set: { memberCount: count } }, opts(session));
  return count;
};


const isDuplicate = (error) => error?.code === 11000;

export const createGroupService = async (userId, body) => {
  const { name, description, privacy, coverUrl } = body || {};

  const trimmed = typeof name === "string" ? name.trim() : "";
  if (trimmed.length < 3) {
    throw ApiError.badRequest("Please correct the highlighted fields.", {
      name: "Group name must be at least 3 characters.",
    });
  }

  if (privacy !== undefined && !["public", "private"].includes(privacy)) {
    throw ApiError.badRequest("Please correct the highlighted fields.", {
      privacy: "Privacy must be either public or private.",
    });
  }

  return atomically(async (session) => {
    const [group] = await Group.create(
      [
        {
          name: trimmed,
          description: typeof description === "string" ? description.trim() : "",
          privacy: privacy ?? "public",
          coverUrl: typeof coverUrl === "string" ? coverUrl.trim() : undefined,
          createdBy: userId,
          memberCount: 1,
        },
      ],
      opts(session),
    );

    try {
      await GroupMember.create(
        [{ groupId: group._id, userId, role: "admin", status: "active" }],
        opts(session),
      );
    } catch (error) {
      if (!session) await Group.deleteOne({ _id: group._id });
      throw error;
    }

    return group;
  });
};

export const listDiscoverService = async (userId, { limit = 20, q } = {}) => {
  const rows = await GroupMember.find({ userId }).select("groupId status").lean();

  const hidden = rows
    .filter((row) => row.status === "active" || row.status === "invited")
    .map((row) => row.groupId);

  const requested = new Set(
    rows.filter((row) => row.status === "requested").map((row) => String(row.groupId)),
  );

  const query = { _id: { $nin: hidden } };
  const search = typeof q === "string" ? q.trim().slice(0, MAX_QUERY) : "";
  if (search) {
    query.name = { $regex: escapeRegex(search), $options: "i" };
  }

  const groups = await Group.find(query)
    .sort({ memberCount: -1, createdAt: -1 })
    .limit(Math.min(Number(limit) || 20, 50))
    .populate("createdBy", "name avatarUrl")
    .lean();

  return groups.map((group) => ({
    group,
    viewerStatus: requested.has(String(group._id)) ? "requested" : null,
  }));
};

/** Every group you belong to, with your role attached. */
export const listMyGroupsService = async (userId) => {
  const rows = await GroupMember.find({ userId, status: "active" })
    .sort({ createdAt: -1 })
    .populate({ path: "groupId", populate: { path: "createdBy", select: "name avatarUrl" } })
    .lean();

  return rows
    .filter((row) => row.groupId)
    .map((row) => ({ group: row.groupId, role: row.role }));
};

/** Groups that have asked you in and are waiting on your answer. */
export const listInvitationsService = async (userId) => {
  const rows = await GroupMember.find({ userId, status: "invited" })
    .sort({ createdAt: -1 })
    .populate({ path: "groupId", populate: { path: "createdBy", select: "name avatarUrl" } })
    .populate("invitedBy", "name avatarUrl")
    .lean();

  return rows
    .filter((row) => row.groupId)
    .map((row) => ({ group: row.groupId, invitedBy: row.invitedBy, invitedAt: row.createdAt }));
};


export const getGroupService = async (groupId, userId) => {
  const group = await requireGroup(groupId);
  const membership = await membershipOf(group._id, userId);

  return { group, membership };
};

export const updateGroupService = async (groupId, userId, body) => {
  const group = await requireGroup(groupId);
  await requireAdmin(group._id, userId);

  const { name, description, privacy, coverUrl } = body || {};

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (trimmed.length < 3) {
      throw ApiError.badRequest("Please correct the highlighted fields.", {
        name: "Group name must be at least 3 characters.",
      });
    }
    group.name = trimmed;
  }

  if (description !== undefined) group.description = String(description).trim();
  if (coverUrl !== undefined) group.coverUrl = String(coverUrl).trim();

  if (privacy !== undefined && !["public", "private"].includes(privacy)) {
    throw ApiError.badRequest("Please correct the highlighted fields.", {
      privacy: "Privacy must be either public or private.",
    });
  }

  const opening = privacy === "public" && group.privacy === "private";
  if (privacy !== undefined) group.privacy = privacy;

  return atomically(async (session) => {
    await group.save(opts(session));

    if (opening) {
      await GroupMember.updateMany(
        { groupId: group._id, status: "requested" },
        { $set: { status: "active" } },
        opts(session),
      );
      group.memberCount = await syncMemberCount(group._id, session);
    }

    return group;
  });
};

/** Removes the group, its memberships and its posts. */
export const deleteGroupService = async (groupId, userId) => {
  const group = await requireGroup(groupId);
  await requireAdmin(group._id, userId);

  const posts = await Post.find({ groupId: group._id })
    .select("imageUrl videoUrl")
    .lean();

  await atomically(async (session) => {
    await GroupMember.deleteMany({ groupId: group._id }, opts(session));
    await Post.deleteMany({ groupId: group._id }, opts(session));
    await Group.deleteOne({ _id: group._id }, opts(session));
  });

  await retract({
    $or: [{ groupId: group._id }, { postId: { $in: posts.map((post) => post._id) } }],
  });
  await PostView.deleteMany({ postId: { $in: posts.map((post) => post._id) } });

  await destroyMediaUrls(
    posts.flatMap((post) => [...(post.imageUrl || []), ...(post.videoUrl || [])]),
  );

  return group;
};

export const joinGroupService = async (groupId, userId) => {
  const group = await requireGroup(groupId);

  try {
    const joined = await atomically(async (session) => {
      const existing = await membershipOf(group._id, userId, session);

      if (existing?.status === "active") {
        throw ApiError.conflict("You are already in this group.");
      }
      const letIn =
        existing?.status === "invited" ||
        (existing?.status === "requested" && group.privacy === "public");

      if (letIn) {
        await GroupMember.updateOne(
          { _id: existing._id },
          { $set: { status: "active" } },
          opts(session),
        );
        await syncMemberCount(group._id, session);
        return { status: "active" };
      }

      if (existing?.status === "requested") {
        throw ApiError.conflict("You have already asked to join this group.");
      }

      const status = group.privacy === "private" ? "requested" : "active";
      await GroupMember.create([{ groupId: group._id, userId, status }], opts(session));
      if (status === "active") await syncMemberCount(group._id, session);

      return { status };
    });

    if (joined.status === "active") {
      await retract({ type: "group-invite", groupId: group._id, recipientId: userId });
    }

    return joined;
  } catch (error) {
    if (!isDuplicate(error)) throw error;

    const row = await membershipOf(group._id, userId);
    throw ApiError.conflict(
      row?.status === "requested"
        ? "You have already asked to join this group."
        : "You are already in this group.",
    );
  }
};


export const inviteMembersService = async (groupId, actorId, userIds) => {
  const group = await requireGroup(groupId);
  const actor = await requireMember(group._id, actorId);
  const isAdmin = actor.role === "admin";

  const wanted = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).map(String))]
    .filter(Boolean)
    .filter((id) => !same(id, actorId));

  if (wanted.length === 0) {
    throw ApiError.badRequest("Please correct the highlighted fields.", {
      userIds: "Choose at least one person to invite.",
    });
  }

  const invalid = wanted.find((id) => !isValidObjectId(id));
  if (invalid) throw ApiError.badRequest("Invalid user id.");

  const people = await User.find({ _id: { $in: wanted }, status: { $ne: "inactive" } })
    .select("_id")
    .lean();

  if (people.length !== wanted.length) {
    throw ApiError.notFound("One of those accounts no longer exists.");
  }

  const result = await atomically(async (session) => {
    const rows = await inTx(
      GroupMember.find({ groupId: group._id, userId: { $in: wanted } }),
      session,
    ).lean();

    const seen = new Map(rows.map((row) => [String(row.userId), row]));

    const invited = [];
    const approved = [];
    const awaitingAdmin = [];

    for (const id of wanted) {
      const row = seen.get(String(id));

      if (row?.status === "requested") {
        if (!isAdmin) {
          awaitingAdmin.push(id);
          continue;
        }

        await GroupMember.updateOne(
          { _id: row._id },
          { $set: { status: "active" } },
          opts(session),
        );
        approved.push(id);
        continue;
      }

      if (row) continue;

      await GroupMember.create(
        [{ groupId: group._id, userId: id, status: "invited", invitedBy: actorId }],
        opts(session),
      );
      invited.push(id);
    }

    if (approved.length > 0) await syncMemberCount(group._id, session);

    return { invited, approved, awaitingAdmin };
  });

  for (const id of result.invited) {
    await notify({ recipientId: id, actorId, type: "group-invite", groupId: group._id });
  }

  if (result.invited.length === 0 && result.approved.length === 0) {
    throw ApiError.conflict(
      result.awaitingAdmin.length > 0
        ? "They have already asked to join. An admin needs to approve them."
        : "They are already in this group, or already invited.",
    );
  }

  return result;
};


export const approveMemberService = async (groupId, actorId, targetId) => {
  const group = await requireGroup(groupId);
  requireId(targetId, "user");

  const approved = await atomically(async (session) => {
    const row = await inTx(
      GroupMember.findOne({ groupId: group._id, userId: targetId }),
      session,
    );
    if (!row) throw ApiError.notFound("There is nothing to answer here.");

    if (row.status === "active") {
      throw ApiError.conflict("That person is already in this group.");
    }

    if (row.status === "invited") {
      if (!same(actorId, targetId)) {
        throw ApiError.forbidden("Only the person invited can accept an invitation.");
      }
    } else {
      await requireAdmin(group._id, actorId, session);
    }

    row.status = "active";
    await row.save(opts(session));
    await syncMemberCount(group._id, session);

    return row;
  });

  await retract({ type: "group-invite", groupId: group._id, recipientId: targetId });

  return approved;
};

export const leaveGroupService = async (groupId, userId) => {
  const group = await requireGroup(groupId);

  return atomically(async (session) => {
    const membership = await activeMembershipOf(group._id, userId, session);
    if (!membership) throw ApiError.notFound("You are not in this group.");

    if (membership.role === "admin" && (await countAdmins(group._id, session)) <= 1) {
      throw ApiError.badRequest(
        "You are the only admin. Make someone else an admin, or delete the group.",
      );
    }

    await GroupMember.deleteOne({ _id: membership._id }, opts(session));
    await syncMemberCount(group._id, session);

    return membership;
  });
};


export const setMemberRoleService = async (groupId, actorId, targetId, role) => {
  const group = await requireGroup(groupId);
  requireId(targetId, "user");

  if (!["admin", "member"].includes(role)) {
    throw ApiError.badRequest("Please correct the highlighted fields.", {
      role: "Role must be either admin or member.",
    });
  }

  return atomically(async (session) => {
    await requireAdmin(group._id, actorId, session);

    const target = await inTx(
      GroupMember.findOne({ groupId: group._id, userId: targetId, status: "active" }),
      session,
    );
    if (!target) throw ApiError.notFound("That person is not in this group.");

    if (target.role === role) {
      throw ApiError.conflict(
        role === "admin" ? "They are already an admin." : "They are not an admin.",
      );
    }

    if (role === "member") {
      if (same(group.createdBy, targetId)) {
        throw ApiError.forbidden("The group creator is always an admin.");
      }

      if ((await countAdmins(group._id, session)) <= 1) {
        throw ApiError.badRequest(
          "A group needs at least one admin. Make someone else an admin first.",
        );
      }
    }

    target.role = role;
    await target.save(opts(session));
    await syncMemberCount(group._id, session);

    return target;
  });
};

export const listMembersService = async (
  groupId,
  userId,
  { limit = 50, status = "active" } = {},
) => {
  const group = await requireGroup(groupId);

  if (!["active", "invited", "requested"].includes(status)) {
    throw ApiError.badRequest("Status must be active, invited or requested.");
  }

  if (status === "requested") await requireAdmin(group._id, userId);
  else if (status === "invited") await requireMember(group._id, userId);
  else await requireReadable(group, userId);

  return GroupMember.find({ groupId: group._id, status })
    .sort({ role: 1, createdAt: 1 })
    .limit(Math.min(Number(limit) || 50, 100))
    .populate("userId", "name avatarUrl work friendsCount")
    .populate("invitedBy", "name avatarUrl")
    .lean();
};


export const removeMemberService = async (groupId, actorId, memberUserId) => {
  const group = await requireGroup(groupId);
  requireId(memberUserId, "user");

  const removed = await atomically(async (session) => {
    const row = await inTx(
      GroupMember.findOne({ groupId: group._id, userId: memberUserId }),
      session,
    );
    if (!row) throw ApiError.notFound("That person is not in this group.");

    const isSelf = same(actorId, memberUserId);

    if (row.status === "active") {
      await requireAdmin(group._id, actorId, session);

      if (isSelf) throw ApiError.badRequest("Use leave to remove yourself.");

      if (same(group.createdBy, memberUserId)) {
        throw ApiError.forbidden("The group creator cannot be removed.");
      }

      await GroupMember.deleteOne({ _id: row._id }, opts(session));
      await syncMemberCount(group._id, session);

      return row;
    }

    
    if (!isSelf) {
      if (row.status === "requested") await requireAdmin(group._id, actorId, session);
      else await requireMember(group._id, actorId, session);
    }

    await GroupMember.deleteOne({ _id: row._id }, opts(session));
    return row;
  });

  if (removed.status === "invited") {
    await retract({ type: "group-invite", groupId: group._id, recipientId: memberUserId });
  }

  return removed;
};


export const assertCanPostInGroup = async (groupId, userId) => {
  const group = await requireGroup(groupId);

  const membership = await activeMembershipOf(group._id, userId);
  if (!membership) throw ApiError.forbidden("Join the group before posting in it.");

  return group;
};

export const assertCanReadGroup = async (groupId, userId) => {
  const group = await requireGroup(groupId);
  await requireReadable(group, userId);
  return group;
};
