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

export const announceNewMessage = safely("message:new", async (conversationId, message) => {
  const online = await onlineOnly(await membersOf(conversationId));
  if (online.length === 0) return;

  await pushMessage("message:new", online, conversationId, await withSender(message));
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
