import { attachment_types, Message } from "../model/message.js";
import { ApiError } from "../utils/apiError.js";
import { isValidObjectId } from "../utils/validators.js";
import { claimUploads, destroyMedia } from "./uploadService.js";
import {
  refreshLastMessage,
  requireConversationAccess,
  touchConversation,
} from "./conversationService.js";

const MAX_ATTACHMENTS = 10;
const MAX_TEXT = 5000;

export const CHANGE_WINDOW_MS = 15 * 60 * 1000;

const same = (a, b) => String(a) === String(b);

//use to check if user can still edit messagge
export const withinChangeWindow = (message) =>
  Date.now() - new Date(message.createdAt).getTime() <= CHANGE_WINDOW_MS;

const requireWindow = (message, verb) => {
  if (!withinChangeWindow(message)) {
    throw ApiError.badRequest(
      `You can only ${verb} a message within ${CHANGE_WINDOW_MS / 60000} minutes of sending it.`,
    );
  }
};


const normalizeAttachments = (value) => {
  if (value === undefined || value === null) return [];

  const list = Array.isArray(value) ? value : [value];
  if (list.length > MAX_ATTACHMENTS) {
    throw ApiError.badRequest(
      `You can attach at most ${MAX_ATTACHMENTS} files to one message.`,
    );
  }

  return list.map((item) => {
    if (!item || typeof item !== "object") {
      throw ApiError.badRequest("Each attachment must come from POST /api/upload.");
    }

    const url = typeof item.url === "string" ? item.url.trim() : "";
    if (!url) {
      throw ApiError.badRequest("Please correct the highlighted fields.", {
        attachments: "Every attachment needs a url.",
      });
    }

    if (!attachment_types.includes(item.type)) {
      throw ApiError.badRequest("Please correct the highlighted fields.", {
        attachments: "An attachment is either an image or a video.",
      });
    }

    return {
      type: item.type,
      url,
      publicId: item.publicId,
      width: item.width,
      height: item.height,
      poster: item.poster,
      durationSec: item.durationSec,
    };
  });
};

/** A message can show: words, media, or both. */
const requireContent = (text, attachments) => {
  if (!text && attachments.length === 0) {
    throw ApiError.badRequest("Write something or attach a photo or video.", {
      text: "A message cannot be empty.",
    });
  }

  if (text.length > MAX_TEXT) {
    throw ApiError.badRequest("Please correct the highlighted fields.", {
      text: `A message must be at most ${MAX_TEXT} characters.`,
    });
  }
};

/** You can only reply to a message that is in the same thread. */
const resolveReplyTo = async (replyTo, conversationId) => {
  if (replyTo === undefined || replyTo === null || replyTo === "") return null;

  if (!isValidObjectId(replyTo)) throw ApiError.badRequest("Invalid message id.");

  const target = await Message.findOne({ _id: replyTo, conversationId }).select("_id");
  if (!target) throw ApiError.notFound("The message you replied to is gone.");

  return target._id;
};


export const listMessagesService = async (
  conversationId,
  userId,
  { limit = 30, before } = {},
) => {
  const { membership } = await requireConversationAccess(conversationId, userId);

  const query = { conversationId, hiddenFor: { $ne: userId } };

  if (membership.clearedAt) query.createdAt = { $gt: membership.clearedAt };

  if (before) {
    if (!isValidObjectId(before)) throw ApiError.badRequest("Invalid message id.");
    query._id = { $lt: before };
  }

  const size = Math.min(Number(limit) || 30, 100);

  const messages = await Message.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(size)
    .populate("senderId", "name avatarUrl")
    .lean();

  return {
    messages,
    nextCursor: messages.length === size ? String(messages[messages.length - 1]._id) : null,
  };
};

export const sendMessageService = async (conversationId, userId, body) => {
  const { conversation } = await requireConversationAccess(conversationId, userId);

  const { text, attachments, replyTo } = body || {};

  const trimmed = typeof text === "string" ? text.trim() : "";
  const media = normalizeAttachments(attachments);
  requireContent(trimmed, media);

  const message = await Message.create({
    conversationId: conversation._id,
    senderId: userId,
    text: trimmed,
    attachments: media,
    replyTo: await resolveReplyTo(replyTo, conversation._id),
  });

  await touchConversation(conversation, message);
  await claimUploads(media, userId);

  return message;
};

const requireOwnMessage = async (conversationId, messageId, userId) => {
  if (!isValidObjectId(messageId)) throw ApiError.badRequest("Invalid message id.");

  const message = await Message.findOne({ _id: messageId, conversationId });
  if (!message) throw ApiError.notFound("Message not found.");

  if (!same(message.senderId, userId)) {
    throw ApiError.forbidden("You can only change your own messages.");
  }

  if (message.deletedAt) {
    throw ApiError.badRequest("That message was unsent.");
  }

  return message;
};

/** Only the words are editable; attachments stay as they were sent. */
export const editMessageService = async (conversationId, messageId, userId, body) => {
  const { conversation } = await requireConversationAccess(conversationId, userId);
  const message = await requireOwnMessage(conversation._id, messageId, userId);

  const { text } = body || {};
  if (text === undefined) {
    throw ApiError.badRequest("Please correct the highlighted fields.", {
      text: "Write the new message.",
    });
  }

  requireWindow(message, "edit");

  const trimmed = String(text).trim();
  requireContent(trimmed, message.attachments || []);

  message.text = trimmed;
  message.editedAt = new Date();
  await message.save();

  await refreshLastMessage(conversation._id);

  return message;
};


export const unsendMessageService = async (conversationId, messageId, userId) => {
  const { conversation } = await requireConversationAccess(conversationId, userId);
  const message = await requireOwnMessage(conversation._id, messageId, userId);

  requireWindow(message, "remove");

  const files = [...(message.attachments || [])];

  message.text = "";
  message.attachments = [];
  message.deletedAt = new Date();
  await message.save();

  await refreshLastMessage(conversation._id);

  await destroyMedia(files);

  return message;
};

//remove message for user only, not for other participants
export const hideMessageService = async (conversationId, messageId, userId) => {
  const { conversation } = await requireConversationAccess(conversationId, userId);

  if (!isValidObjectId(messageId)) throw ApiError.badRequest("Invalid message id.");

  const message = await Message.findOne({
    _id: messageId,
    conversationId: conversation._id,
  });
  if (!message) throw ApiError.notFound("Message not found.");

  await Message.updateOne({ _id: message._id }, { $addToSet: { hiddenFor: userId } });

  return message;
};
