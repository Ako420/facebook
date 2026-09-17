import { User } from "../model/user.js";
import { Friend } from "../model/friend.js";
import { ApiError } from "../utils/apiError.js";
import { emitToUsers } from "../lib/realtime.js";
import { notify, retract } from "./notificationService.js";


const USER_FIELDS = "name avatarUrl work friendsCount";

const same = (a, b) => String(a) === String(b);

const announceFriendsChanged = (friend) =>
  emitToUsers([friend.userId, friend.friendId], "friends:changed", {});

export const getFriendByIdService = async (id) => {
  if (!id) throw ApiError.badRequest("Invalid Friend id");

  const friend = await Friend.findById(id)
    .populate("userId", USER_FIELDS)
    .populate("friendId", USER_FIELDS);

  if (!friend) throw ApiError.notFound("Friend not found");
  return friend;
};


export const getFriendsByUserIdService = async (userId) => {
  if (!userId) throw ApiError.badRequest("Invalid User id");

  const rows = await Friend.find({
    $or: [{ userId }, { friendId: userId }],
  })
    .populate("userId", USER_FIELDS)
    .populate("friendId", USER_FIELDS)
    .sort({ createdAt: -1 })
    .lean();

  const friends = [];
  const incoming = [];
  const outgoing = [];

  for (const row of rows) {
    const sentByMe = same(row.userId?._id ?? row.userId, userId);
    const other = sentByMe ? row.friendId : row.userId;

    if (!other || !other._id) continue;

    const entry = {
      id: row._id,
      status: row.status,
      createdAt: row.createdAt,
      user: {
        id: other._id,
        name: other.name,
        avatarUrl: other.avatarUrl,
        work: other.work,
        friendsCount: other.friendsCount ?? 0,
      },
    };

    if (row.status === "accepted") friends.push(entry);
    else if (row.status === "pending") (sentByMe ? outgoing : incoming).push(entry);
  }

  return { friends, incoming, outgoing };
};


export const getSuggestionsService = async (userId, limit = 20) => {
  if (!userId) throw ApiError.badRequest("Invalid User id");

  const rows = await Friend.find({
    $or: [{ userId }, { friendId: userId }],
  })
    .select("userId friendId")
    .lean();

  const connected = new Set([String(userId)]);
  for (const row of rows) {
    connected.add(String(row.userId));
    connected.add(String(row.friendId));
  }

  return User.find({ _id: { $nin: [...connected] }, status: { $ne: 'inactive' } })
    .select(USER_FIELDS)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 20, 50))
    .lean();
};

export const createFriendService = async (userId, friendId) => {
  if (!userId || !friendId)
    throw ApiError.badRequest("Invalid User id or Friend id");

  if (same(userId, friendId))
    throw ApiError.badRequest("Cannot add yourself as a friend");

  const target = await User.findById(friendId).select("_id");
  if (!target) throw ApiError.notFound("That account no longer exists.");


  const existing = await Friend.findOne({
    $or: [
      { userId, friendId },
      { userId: friendId, friendId: userId },
    ],
  });
  if (existing) throw ApiError.conflict("Friend request already exists");

  const friend = new Friend({ userId, friendId });
  await friend.save();

  await notify({
    recipientId: friendId,
    actorId: userId,
    type: "friend-request",
    friendId: friend._id,
  });
  announceFriendsChanged(friend);

  return friend;
};


const shiftFriendCounts = async (aId, bId, delta) => {
  await User.updateMany(
    { _id: { $in: [aId, bId] } },
    { $inc: { friendsCount: delta } },
  );

  if (delta < 0) {
    await User.updateMany(
      { _id: { $in: [aId, bId] }, friendsCount: { $lt: 0 } },
      { $set: { friendsCount: 0 } },
    );
  }
};

export const updateFriendStatusService = async (id, status, actorId) => {
  if (!id || !status) throw ApiError.badRequest("Invalid Friend id or status");

  if (!["pending", "accepted", "rejected"].includes(status))
    throw ApiError.badRequest("Invalid status value");

  const friend = await Friend.findById(id);
  if (!friend) throw ApiError.notFound("Friend not found");

  if (actorId && !same(friend.friendId, actorId)) {
    throw ApiError.forbidden("Only the person who received this request can answer it.");
  }

  const wasAccepted = friend.status === "accepted";
  friend.status = status;
  await friend.save();

  if (!wasAccepted && status === "accepted") {
    await shiftFriendCounts(friend.userId, friend.friendId, 1);
  } else if (wasAccepted && status !== "accepted") {
    await shiftFriendCounts(friend.userId, friend.friendId, -1);
  }

  if (status !== "pending") {
    await retract({ type: "friend-request", friendId: friend._id });
  }

  if (!wasAccepted && status === "accepted") {
    await notify({
      recipientId: friend.userId,
      actorId: friend.friendId,
      type: "friend-accepted",
      friendId: friend._id,
    });
  }

  announceFriendsChanged(friend);

  return friend;
};

export const deleteFriendService = async (id, actorId) => {
  if (!id) throw ApiError.badRequest("Invalid Friend id");

  const friend = await Friend.findById(id);
  if (!friend) throw ApiError.notFound("Friend not found");

  // Only the two people involved can remove the connection.
  if (actorId && !same(friend.userId, actorId) && !same(friend.friendId, actorId)) {
    throw ApiError.forbidden("You are not part of this friendship.");
  }

  const wasAccepted = friend.status === "accepted";
  await friend.deleteOne();
  
  if (wasAccepted) {
    await shiftFriendCounts(friend.userId, friend.friendId, -1);
  }

  await retract({ friendId: friend._id });
  announceFriendsChanged(friend);

  return friend;
};
