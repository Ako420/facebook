import { Conversation, directKeyFor } from "../model/conversation.js";
import { ConversationMember } from "../model/conversationMember.js";
import { Message } from "../model/message.js";
import { User } from "../model/user.js";
import { ApiError } from "../utils/apiError.js";
import { isValidObjectId } from "../utils/validators.js";
import {
  announceConversationChange,
  announceRead,
  announceRemoval,
} from "./conversationEvents.js";

const USER_FIELDS = "name avatarUrl work friendsCount";

/** A group chat past this size stops being a chat. */
export const MAX_PARTICIPANTS = 50;

const same = (a, b) => String(a) === String(b);

const requireId = (id, label = "conversation") => {
  if (!isValidObjectId(id)) throw ApiError.badRequest(`Invalid ${label} id.`);
};

const requireConversation = async (conversationId) => {
  requireId(conversationId);
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw ApiError.notFound("Conversation not found.");
  return conversation;
};

export const requireMembership = async (conversationId, userId) => {
  const membership = await ConversationMember.findOne({ conversationId, userId });
  if (!membership) throw ApiError.notFound("Conversation not found.");
  return membership;
};


export const requireConversationAccess = async (conversationId, userId) => {
  const conversation = await requireConversation(conversationId);
  const membership = await requireMembership(conversation._id, userId);
  return { conversation, membership };
};

const requireGroupChat = (conversation) => {
  if (conversation.type !== "group") {
    throw ApiError.badRequest("That only applies to group chats.");
  }
};

const requireAdmin = (membership) => {
  if (membership.role !== "admin") {
    throw ApiError.forbidden("Only a chat admin can do that.");
  }
};

/** Ids that point at a real, active account, with duplicates and self removed. */
const resolveUsers = async (ids, actorId) => {
  const wanted = [...new Set((Array.isArray(ids) ? ids : [ids]).map(String))]
    .filter(Boolean)
    .filter((id) => !same(id, actorId));

  const invalid = wanted.find((id) => !isValidObjectId(id));
  if (invalid) throw ApiError.badRequest("Invalid user id.");

  const users = await User.find({ _id: { $in: wanted }, status: { $ne: "inactive" } })
    .select("_id")
    .lean();

  if (users.length !== wanted.length) {
    throw ApiError.notFound("One of those accounts no longer exists.");
  }

  return users.map((user) => user._id);
};


export const startDirectService = async (userId, otherUserId) => {
  if (!otherUserId) {
    throw ApiError.badRequest("Please correct the highlighted fields.", {
      userId: "Choose someone to message.",
    });
  }

  if (same(userId, otherUserId)) {
    throw ApiError.badRequest("You cannot start a chat with yourself.");
  }

  const [target] = await resolveUsers([otherUserId], userId);
  const directKey = directKeyFor(userId, target);

  const existing = await Conversation.findOne({ directKey });
  if (existing) {
    await ConversationMember.updateOne(
      { conversationId: existing._id, userId },
      { $set: { hidden: false } },
    );
    await announceConversationChange(existing._id, [userId]);
    return { conversation: existing, created: false };
  }

  let conversation;
  try {
    conversation = await Conversation.create({
      type: "direct",
      createdBy: userId,
      directKey,
      lastMessageAt: new Date(),
    });
  } catch (error) {
    if (error?.code === 11000) {
      const won = await Conversation.findOne({ directKey });
      if (won) return { conversation: won, created: false };
    }
    throw error;
  }

  await ConversationMember.insertMany([
    { conversationId: conversation._id, userId, role: "member" },
    { conversationId: conversation._id, userId: target, role: "member" },
  ]);

  await announceConversationChange(conversation._id);

  return { conversation, created: true };
};

export const createGroupChatService = async (userId, body) => {
  const { name, participantIds, avatarUrl } = body || {};

  const members = await resolveUsers(participantIds || [], userId);
  if (members.length < 2) {
    throw ApiError.badRequest("Please correct the highlighted fields.", {
      participantIds: "A group chat needs at least two other people.",
    });
  }

  if (members.length + 1 > MAX_PARTICIPANTS) {
    throw ApiError.badRequest(
      `A group chat can hold at most ${MAX_PARTICIPANTS} people.`,
    );
  }

  const trimmed = typeof name === "string" ? name.trim() : "";
  if (trimmed.length > 75) {
    throw ApiError.badRequest("Please correct the highlighted fields.", {
      name: "Chat name must be at most 75 characters.",
    });
  }

  const conversation = await Conversation.create({
    type: "group",
    name: trimmed,
    avatarUrl: typeof avatarUrl === "string" ? avatarUrl.trim() : undefined,
    createdBy: userId,
    lastMessageAt: new Date(),
  });

  await ConversationMember.insertMany([
    { conversationId: conversation._id, userId, role: "admin" },
    ...members.map((id) => ({
      conversationId: conversation._id,
      userId: id,
      role: "member",
    })),
  ]);

  await announceConversationChange(conversation._id);

  return conversation;
};

/** Every member row of these conversations, grouped by conversation id. */
const participantsByConversation = async (conversationIds) => {
  const rows = await ConversationMember.find({
    conversationId: { $in: conversationIds },
  })
    .sort({ role: 1, createdAt: 1 })
    .populate("userId", USER_FIELDS)
    .lean();

  const map = new Map();
  for (const row of rows) {
    if (!row.userId) continue;
    const key = String(row.conversationId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
};

/** The inbox: your visible chats, most recently active first. */
export const listConversationsService = async (userId, { limit = 20 } = {}) => {
  const mine = await ConversationMember.find({ userId, hidden: false })
    .select("conversationId")
    .lean();

  if (mine.length === 0) return [];

  const conversations = await Conversation.find({
    _id: { $in: mine.map((row) => row.conversationId) },
  })
    .sort({ lastMessageAt: -1 })
    .limit(Math.min(Number(limit) || 20, 50))
    .lean();

  const participants = await participantsByConversation(
    conversations.map((row) => row._id),
  );

  await rewriteHiddenPreviews(conversations, userId);

  return conversations.map((conversation) => {
    const rows = participants.get(String(conversation._id)) || [];
    return {
      conversation,
      participants: rows,
      membership: rows.find((row) => same(row.userId?._id, userId)) || null,
    };
  });
};

/**
 * A conversation stores one preview for everybody, so a message someone
 * removed from their own thread would still show in their inbox. This walks
 * those rows back to the newest message they can actually still see.
 *
 * One query finds the affected chats, which is almost always none.
 */
const rewriteHiddenPreviews = async (conversations, userId) => {
  const withPreview = conversations.filter((row) => row.lastMessage?.messageId);
  if (withPreview.length === 0) return;

  const hidden = await Message.find({
    _id: { $in: withPreview.map((row) => row.lastMessage.messageId) },
    hiddenFor: userId,
  })
    .select("conversationId")
    .lean();

  if (hidden.length === 0) return;

  const affected = new Set(hidden.map((row) => String(row.conversationId)));

  await Promise.all(
    conversations
      .filter((row) => affected.has(String(row._id)))
      .map(async (conversation) => {
        const previous = await Message.findOne({
          conversationId: conversation._id,
          hiddenFor: { $ne: userId },
        })
          .sort({ createdAt: -1, _id: -1 })
          .lean();

        conversation.lastMessage = previous
          ? {
              messageId: previous._id,
              senderId: previous.senderId,
              preview: previewOf(previous),
              sentAt: previous.createdAt,
            }
          : null;
      }),
  );
};

export const getConversationService = async (conversationId, userId) => {
  const conversation = await requireConversation(conversationId);
  await requireMembership(conversation._id, userId);

  const participants =
    (await participantsByConversation([conversation._id])).get(
      String(conversation._id),
    ) || [];

  return {
    conversation: conversation.toObject(),
    participants,
    membership: participants.find((row) => same(row.userId?._id, userId)) || null,
  };
};

export const listParticipantsService = async (conversationId, userId) => {
  const conversation = await requireConversation(conversationId);
  await requireMembership(conversation._id, userId);

  return (
    (await participantsByConversation([conversation._id])).get(
      String(conversation._id),
    ) || []
  );
};

/** Renaming and re-covering a group chat. Admins only. */
export const updateConversationService = async (conversationId, userId, body) => {
  const conversation = await requireConversation(conversationId);
  const membership = await requireMembership(conversation._id, userId);

  requireGroupChat(conversation);
  requireAdmin(membership);

  const { name, avatarUrl } = body || {};

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (trimmed.length > 75) {
      throw ApiError.badRequest("Please correct the highlighted fields.", {
        name: "Chat name must be at most 75 characters.",
      });
    }
    conversation.name = trimmed;
  }

  if (avatarUrl !== undefined) conversation.avatarUrl = String(avatarUrl).trim();

  await conversation.save();
  await announceConversationChange(conversation._id);
  return conversation;
};

/**
 * Deleting a chat is personal: the thread stays for everyone else, you stop
 * seeing the messages that came before now, and a new message brings it back.
 */
export const clearConversationService = async (conversationId, userId) => {
  const conversation = await requireConversation(conversationId);
  const membership = await requireMembership(conversation._id, userId);

  const now = new Date();
  membership.clearedAt = now;
  membership.hidden = true;
  membership.unreadCount = 0;
  membership.lastReadAt = now;
  await membership.save();

  await announceRemoval(conversation._id, [userId]);

  return membership;
};

export const markReadService = async (conversationId, userId) => {
  const conversation = await requireConversation(conversationId);
  const membership = await requireMembership(conversation._id, userId);

  membership.unreadCount = 0;
  membership.lastReadAt = new Date();
  await membership.save();

  await announceRead(conversation._id, userId);

  return membership;
};

/** The one number the message icon needs: unread chats and unread messages. */
export const unreadSummaryService = async (userId) => {
  const rows = await ConversationMember.find({
    userId,
    hidden: false,
    unreadCount: { $gt: 0 },
  })
    .select("unreadCount")
    .lean();

  return {
    conversations: rows.length,
    messages: rows.reduce((total, row) => total + (row.unreadCount || 0), 0),
  };
};

export const addParticipantsService = async (conversationId, actorId, userIds) => {
  const conversation = await requireConversation(conversationId);
  await requireMembership(conversation._id, actorId);

  if (conversation.type !== "group") {
    throw ApiError.badRequest(
      "You cannot add people to a direct chat. Start a group chat instead.",
    );
  }

  const wanted = await resolveUsers(userIds || [], actorId);
  if (wanted.length === 0) {
    throw ApiError.badRequest("Please correct the highlighted fields.", {
      userIds: "Choose at least one person to add.",
    });
  }

  const current = await ConversationMember.find({ conversationId: conversation._id })
    .select("userId")
    .lean();
  const alreadyIn = new Set(current.map((row) => String(row.userId)));

  const toAdd = wanted.filter((id) => !alreadyIn.has(String(id)));
  if (toAdd.length === 0) {
    throw ApiError.conflict("They are already in this chat.");
  }

  if (current.length + toAdd.length > MAX_PARTICIPANTS) {
    throw ApiError.badRequest(
      `A group chat can hold at most ${MAX_PARTICIPANTS} people.`,
    );
  }

  await ConversationMember.insertMany(
    toAdd.map((id) => ({
      conversationId: conversation._id,
      userId: id,
      role: "member",
    })),
  );

  await announceConversationChange(conversation._id);

  return toAdd;
};

/**
 * A group chat must have an admin
 */
const rebalanceAfterDeparture = async (conversation, departedRole) => {
  const remaining = await ConversationMember.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .lean();

  if (remaining.length === 0) {
    await Message.deleteMany({ conversationId: conversation._id });
    await Conversation.deleteOne({ _id: conversation._id });
    return;
  }

  if (departedRole !== "admin") return;

  const hasAdmin = remaining.some((row) => row.role === "admin");
  if (!hasAdmin) {
    await ConversationMember.updateOne(
      { _id: remaining[0]._id },
      { $set: { role: "admin" } },
    );
  }
};

export const leaveConversationService = async (conversationId, userId) => {
  const conversation = await requireConversation(conversationId);
  const membership = await requireMembership(conversation._id, userId);

  if (conversation.type !== "group") {
    throw ApiError.badRequest("You cannot leave a direct chat. Delete it instead.");
  }

  await ConversationMember.deleteOne({ _id: membership._id });
  await rebalanceAfterDeparture(conversation, membership.role);

  await announceRemoval(conversation._id, [userId]);
  await announceConversationChange(conversation._id);

  return membership;
};

export const removeParticipantService = async (conversationId, actorId, targetId) => {
  const conversation = await requireConversation(conversationId);
  const membership = await requireMembership(conversation._id, actorId);

  requireGroupChat(conversation);
  requireAdmin(membership);
  requireId(targetId, "user");

  if (same(actorId, targetId)) {
    throw ApiError.badRequest("Use leave to remove yourself.");
  }

  const target = await ConversationMember.findOne({
    conversationId: conversation._id,
    userId: targetId,
  });
  if (!target) throw ApiError.notFound("That person is not in this chat.");

  await ConversationMember.deleteOne({ _id: target._id });
  await rebalanceAfterDeparture(conversation, target.role);

  await announceRemoval(conversation._id, [target.userId]);
  await announceConversationChange(conversation._id);

  return target;
};

/** What the inbox shows under a name when the message itself is not text. */
const previewOf = (message) => {
  if (message.deletedAt) return "Message unsent";
  if (message.text) return message.text.slice(0, 140);

  const attachments = message.attachments || [];
  if (attachments.length === 0) return "";

  return attachments.length > 1
    ? "Sent attachments"
    : `Sent a ${attachments[0].type}`;
};


export const touchConversation = async (conversation, message) => {
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessageAt: message.createdAt,
        lastMessage: {
          messageId: message._id,
          senderId: message.senderId,
          preview: previewOf(message),
          sentAt: message.createdAt,
        },
      },
    },
  );

  await ConversationMember.updateOne(
    { conversationId: conversation._id, userId: message.senderId },
    { $set: { hidden: false, lastReadAt: message.createdAt, unreadCount: 0 } },
  );

  await ConversationMember.updateMany(
    { conversationId: conversation._id, userId: { $ne: message.senderId } },
    { $set: { hidden: false }, $inc: { unreadCount: 1 } },
  );
};

/** Keeps the inbox preview honest after the newest message is edited or unsent. */
export const refreshLastMessage = async (conversationId) => {
  const latest = await Message.findOne({ conversationId })
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  if (!latest) {
    await Conversation.updateOne(
      { _id: conversationId },
      { $unset: { lastMessage: "" } },
    );
    return;
  }

  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        lastMessage: {
          messageId: latest._id,
          senderId: latest.senderId,
          preview: previewOf(latest),
          sentAt: latest.createdAt,
        },
      },
    },
  );
};
