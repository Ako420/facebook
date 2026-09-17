import mongoose from "mongoose";

export const conversation_roles = ["admin", "member"];

const conversationMemberSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversations",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    role: {
      type: String,
      enum: {
        values: conversation_roles,
        message: "Role must be either admin or member.",
      },
      default: "member",
    },
    unreadCount: {
      type: Number,
      default: 0,
      min: [0, "Unread count cannot be negative."],
    },
    lastReadAt: {
      type: Date,
    },
    lastDeliveredAt: {
      type: Date,
    },
    clearedAt: {
      type: Date,
    },
    hidden: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

conversationMemberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

conversationMemberSchema.index({ userId: 1, hidden: 1 });

export const ConversationMember = mongoose.model(
  "ConversationMembers",
  conversationMemberSchema,
);
