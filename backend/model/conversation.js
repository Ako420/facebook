import mongoose from "mongoose";

export const conversation_types = ["direct", "group"];

const lastMessageSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Messages",
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    preview: {
      type: String,
      trim: true,
      maxlength: [140, "Preview must be at most 140 characters."],
    },
    sentAt: {
      type: Date,
    },
  },
  { _id: false },
);

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: {
        values: conversation_types,
        message: "Type must be either direct or group.",
      },
      default: "direct",
      index: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: [75, "Chat name must be at most 75 characters."],
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    directKey: {
      type: String,
      index: { unique: true, sparse: true },
    },
    lastMessage: lastMessageSchema,
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);


export const directKeyFor = (a, b) => [String(a), String(b)].sort().join(":");

export const Conversation = mongoose.model("Conversations", conversationSchema);
