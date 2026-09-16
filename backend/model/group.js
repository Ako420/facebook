import mongoose from "mongoose";

export const group_privacy = ["public", "private"];

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required."],
      trim: true,
      minlength: [3, "Group name must be at least 3 characters."],
      maxlength: [75, "Group name must be at most 75 characters."],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be at most 500 characters."],
    },
    privacy: {
      type: String,
      enum: {
        values: group_privacy,
        message: "Privacy must be either public or private.",
      },
      default: "public",
      index: true,
    },
    coverUrl: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    memberCount: {
      type: Number,
      default: 1,
      min: [0, "Member count cannot be negative."],
    },
  },
  { timestamps: true },
);

export const Group = mongoose.model("Groups", groupSchema);
