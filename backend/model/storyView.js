import mongoose from "mongoose";

const storyViewSchema = new mongoose.Schema(
  {
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stories",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
  },
  { timestamps: true },
);

// One view per person per story, so the count cannot be inflated by reopening.
storyViewSchema.index({ storyId: 1, userId: 1 }, { unique: true });
// The rail's question: which of these have I already seen?
storyViewSchema.index({ userId: 1, storyId: 1 });

export const StoryView = mongoose.model("StoryViews", storyViewSchema);
