import { Notification } from "../model/notification.js";
import { emitToUser, isOnline } from "../lib/realtime.js";
import { ApiError } from "../utils/apiError.js";
import { publicNotification } from "../utils/presenters.js";
import { isValidObjectId } from "../utils/validators.js";

const same = (a, b) => String(a) === String(b);

const POPULATE = [
  { path: "actorId", select: "name avatarUrl", match: { status: { $ne: "inactive" } } },
  { path: "postId", select: "type groupId" },
  { path: "commentId", select: "content" },
  { path: "groupId", select: "name" },
];

const unreadCountOf = (recipientId) =>
  Notification.countDocuments({ recipientId, readAt: null });

export const notify = async ({ recipientId, actorId, type, postId, commentId, groupId, friendId }) => {
  if (!recipientId || same(recipientId, actorId)) return null;

  try {
    const row = await Notification.create({
      recipientId,
      actorId,
      type,
      postId,
      commentId,
      groupId,
      friendId,
    });

    if (await isOnline(recipientId)) {
      const full = await Notification.findById(row._id).populate(POPULATE).lean();

      await emitToUser(recipientId, "notification:new", {
        notification: publicNotification(full),
        unread: await unreadCountOf(recipientId),
      });
    }

    return row;
  } catch (error) {
    console.error("Could not create notification:", error.message);
    return null;
  }
};

/** remove notification when when even is undo
 * eg. reaction removed, a comment deleted, a request answered
 */
export const retract = async (filter) => {
  try {
    const rows = await Notification.find(filter).select("_id recipientId").lean();
    if (rows.length === 0) return;

    await Notification.deleteMany({ _id: { $in: rows.map((row) => row._id) } });

    const byRecipient = new Map();
    for (const row of rows) {
      const key = String(row.recipientId);
      if (!byRecipient.has(key)) byRecipient.set(key, []);
      byRecipient.get(key).push(String(row._id));
    }

    for (const [recipientId, ids] of byRecipient) {
      if (!(await isOnline(recipientId))) continue;

      await emitToUser(recipientId, "notification:removed", {
        ids,
        unread: await unreadCountOf(recipientId),
      });
    }
  } catch (error) {
    console.error("Could not retract notifications:", error.message);
  }
};

export const listNotificationsService = async (userId, { limit = 20, before } = {}) => {
  const query = { recipientId: userId };

  if (before) {
    if (!isValidObjectId(before)) throw ApiError.badRequest("Invalid notification id.");
    query._id = { $lt: before };
  }

  const size = Math.min(Number(limit) || 20, 50);

  const rows = await Notification.find(query)
    .sort({ _id: -1 })
    .limit(size)
    .populate(POPULATE)
    .lean();

  return {
    notifications: rows.filter((row) => row.actorId).map(publicNotification),
    nextCursor: rows.length === size ? String(rows[rows.length - 1]._id) : null,
    unread: await unreadCountOf(userId),
  };
};

export const unreadNotificationsService = (userId) => unreadCountOf(userId);

export const markNotificationReadService = async (userId, notificationId) => {
  if (!isValidObjectId(notificationId)) {
    throw ApiError.badRequest("Invalid notification id.");
  }

  const row = await Notification.findOne({ _id: notificationId, recipientId: userId });
  if (!row) throw ApiError.notFound("Notification not found.");

  if (!row.readAt) {
    row.readAt = new Date();
    await row.save();
  }

  const unread = await unreadCountOf(userId);
  await emitToUser(userId, "notification:read", { ids: [String(row._id)], unread });

  return unread;
};

export const markAllNotificationsReadService = async (userId) => {
  await Notification.updateMany(
    { recipientId: userId, readAt: null },
    { $set: { readAt: new Date() } },
  );

  await emitToUser(userId, "notification:read", { ids: "all", unread: 0 });

  return 0;
};
