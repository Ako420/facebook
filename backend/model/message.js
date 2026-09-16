import mongoose from "mongoose";

export const attachment_types = ["image", "video"];


const attachmentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: {
        values: attachment_types,
        message: "Attachment type must be either image or video.",
      },
      required: true,
    },
    url: {
      type: String,
      trim: true,
      required: [true, "Attachment url is required."],
    },
    publicId: { type: String, trim: true },
    width: { type: Number },
    height: { type: Number },
    poster: { type: String, trim: true },
    durationSec: { type: Number },
  },
  { _id: false },
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversations",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: [5000, "A message must be at most 5000 characters."],
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Messages",
      default: null,
    },
    editedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },
    // Removed from these people's view only. Everyone else still sees it.
    hiddenFor: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
      default: [],
    },
  },
  { timestamps: true },
);


messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model("Messages", messageSchema);
