import mongoose from "mongoose";

export const notification_types = [
  "friend-request",
  "friend-accepted",
  "comment",
  "reaction",
  "group-invite",
];

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    type: {
      type: String,
      enum: {
        values: notification_types,
        message: "That notification type is not recognised.",
      },
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Posts",
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comments",
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Groups",
    },
    friendId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Friends",
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, _id: -1 });
notificationSchema.index({ recipientId: 1, readAt: 1 });

export const Notification = mongoose.model("Notifications", notificationSchema);
