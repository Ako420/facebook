import { ConversationMember } from "../model/conversationMember.js";
import { User } from "../model/user.js";
import { emitToUser, emitToUsers, isOnline } from "../lib/realtime.js";
import { publicMessage } from "../utils/presenters.js";

const safely = (label, work) => async (...args) => {
  try {
    await work(...args);
  } catch (error) {
    console.error(`Realtime ${label} failed:`, error.message);
  }
};

const membersOf = (conversationId) =>
  ConversationMember.find({ conversationId }).select("userId clearedAt").lean();

const withSender = async (message) => {
  const plain = typeof message.toObject === "function" ? message.toObject() : { ...message };
  if (plain.senderId?.name !== undefined) return plain;

  const sender = await User.findById(plain.senderId).select("name avatarUrl").lean();
  return { ...plain, senderId: sender ?? plain.senderId };
};

const pushMessage = (type, rows, conversationId, message) => {
  for (const row of rows) {
    emitToUser(row.userId, type, {
      conversationId: String(conversationId),
      message: publicMessage(message, row.userId),
    });
  }
};

export const announceNewMessage = safely("message:new", async (conversationId, message) => {
  const online = (await membersOf(conversationId)).filter((row) => isOnline(row.userId));
  if (online.length === 0) return;

  pushMessage("message:new", online, conversationId, await withSender(message));
});

export const announceMessageChange = safely("message:updated", async (conversationId, message) => {
  const hiddenFor = new Set((message.hiddenFor ?? []).map(String));
  const sentAt = new Date(message.createdAt);

  const audience = (await membersOf(conversationId)).filter(
    (row) =>
      isOnline(row.userId) &&
      !hiddenFor.has(String(row.userId)) &&
      !(row.clearedAt && new Date(row.clearedAt) >= sentAt),
  );
  if (audience.length === 0) return;

  pushMessage("message:updated", audience, conversationId, await withSender(message));
});

export const announceMessageHidden = safely("message:hidden", async (conversationId, messageId, userId) => {
  emitToUser(userId, "message:hidden", {
    conversationId: String(conversationId),
    messageId: String(messageId),
  });
});

export const announceRead = safely("conversation:read", async (conversationId, userId) => {
  emitToUser(userId, "conversation:read", { conversationId: String(conversationId) });
});

export const announceConversationChange = safely("conversation:updated", async (conversationId, userIds) => {
  const ids = userIds ?? (await membersOf(conversationId)).map((row) => row.userId);

  emitToUsers(ids, "conversation:updated", { conversationId: String(conversationId) });
});

export const announceRemoval = safely("conversation:removed", async (conversationId, userIds) => {
  emitToUsers(userIds, "conversation:removed", { conversationId: String(conversationId) });
});
