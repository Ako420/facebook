import { Conversation } from "../model/conversation.js";
import { ConversationMember } from "../model/conversationMember.js";
import { User } from "../model/user.js";
import { emitToUser, emitToUsers, isOnline, sendEphemeral } from "../lib/realtime.js";
import { publicMessage } from "../utils/presenters.js";
import { isValidObjectId } from "../utils/validators.js";

const safely = (label, work) => async (...args) => {
  try {
    await work(...args);
  } catch (error) {
    console.error(`Realtime ${label} failed:`, error.message);
  }
};

const membersOf = (conversationId) =>
  ConversationMember.find({ conversationId }).select("userId clearedAt").lean();

const onlineOnly = async (rows) => {
  const online = await Promise.all(rows.map((row) => isOnline(row.userId)));
  return rows.filter((_, index) => online[index]);
};

const withSender = async (message) => {
  const plain = typeof message.toObject === "function" ? message.toObject() : { ...message };
  if (plain.senderId?.name !== undefined) return plain;

  const sender = await User.findById(plain.senderId).select("name avatarUrl").lean();
  return { ...plain, senderId: sender ?? plain.senderId };
};

const pushMessage = (type, rows, conversationId, message) =>
  Promise.all(
    rows.map((row) =>
      emitToUser(row.userId, type, {
        conversationId: String(conversationId),
        message: publicMessage(message, row.userId),
      }),
    ),
  );

const markDelivered = (conversationId, userIds, at) =>
  ConversationMember.updateMany(
    { conversationId, userId: { $in: userIds } },
    { $max: { lastDeliveredAt: at } },
  );

const announceReceipts = (conversationId, members, userIds, kind, at) =>
  emitToUsers(
    members.map((row) => row.userId),
    "conversation:receipt",
    { conversationId: String(conversationId), userIds: userIds.map(String), kind, at },
  );

export const announceNewMessage = safely("message:new", async (conversationId, message) => {
  const members = await membersOf(conversationId);
  const online = await onlineOnly(members);
  if (online.length === 0) return;

  await pushMessage("message:new", online, conversationId, await withSender(message));

  const senderId = String(message.senderId?._id ?? message.senderId);
  const delivered = online
    .map((row) => String(row.userId))
    .filter((userId) => userId !== senderId);
  if (delivered.length === 0) return;

  await markDelivered(conversationId, delivered, message.createdAt);
  await announceReceipts(conversationId, members, delivered, "delivered", message.createdAt);
});

export const announceMessageChange = safely("message:updated", async (conversationId, message) => {
  const hiddenFor = new Set((message.hiddenFor ?? []).map(String));
  const sentAt = new Date(message.createdAt);

  const audience = (await membersOf(conversationId)).filter(
    (row) =>
      !hiddenFor.has(String(row.userId)) &&
      !(row.clearedAt && new Date(row.clearedAt) >= sentAt),
  );
  const online = await onlineOnly(audience);
  if (online.length === 0) return;

  await pushMessage("message:updated", online, conversationId, await withSender(message));
});

export const announceMessageHidden = safely("message:hidden", async (conversationId, messageId, userId) => {
  await emitToUser(userId, "message:hidden", {
    conversationId: String(conversationId),
    messageId: String(messageId),
  });
});

export const announceRead = safely("conversation:read", async (conversationId, userId) => {
  await emitToUser(userId, "conversation:read", { conversationId: String(conversationId) });
});

export const announceSeen = safely("conversation:receipt", async (conversationId, userId, at) => {
  const members = await membersOf(conversationId);
  await announceReceipts(conversationId, members, [userId], "seen", at);
});

export const catchUpDeliveries = safely("delivery catch-up", async (userId) => {
  const memberships = await ConversationMember.find({ userId, hidden: false })
    .select("conversationId lastDeliveredAt")
    .lean();
  if (memberships.length === 0) return;

  const conversations = await Conversation.find({
    _id: { $in: memberships.map((row) => row.conversationId) },
  })
    .select("lastMessageAt")
    .lean();

  const latest = new Map(conversations.map((row) => [String(row._id), row.lastMessageAt]));

  const pending = memberships.filter((row) => {
    const sentAt = latest.get(String(row.conversationId));
    return sentAt && (!row.lastDeliveredAt || new Date(row.lastDeliveredAt) < new Date(sentAt));
  });
  if (pending.length === 0) return;

  const at = new Date();
  await ConversationMember.updateMany(
    { userId, conversationId: { $in: pending.map((row) => row.conversationId) } },
    { $max: { lastDeliveredAt: at } },
  );

  for (const row of pending) {
    const members = await membersOf(row.conversationId);
    await announceReceipts(row.conversationId, members, [userId], "delivered", at);
  }
});

export const announceConversationChange = safely("conversation:updated", async (conversationId, userIds) => {
  const ids = userIds ?? (await membersOf(conversationId)).map((row) => row.userId);

  await emitToUsers(ids, "conversation:updated", { conversationId: String(conversationId) });
});

export const announceRemoval = safely("conversation:removed", async (conversationId, userIds) => {
  await emitToUsers(userIds, "conversation:removed", { conversationId: String(conversationId) });
});

export const relayTyping = safely("typing", async (conversationId, user) => {
  if (!isValidObjectId(conversationId)) return;

  const members = await membersOf(conversationId);
  if (!members.some((row) => String(row.userId) === user.userId)) return;

  const others = members
    .map((row) => String(row.userId))
    .filter((userId) => userId !== user.userId);

  await sendEphemeral(others, "typing", {
    conversationId: String(conversationId),
    userId: user.userId,
    name: user.userName,
  });
});
