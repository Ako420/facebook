import mongoose from "mongoose";

const postViewSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Posts",
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

// One row per person per post, so a second look cannot be recorded twice.
postViewSchema.index({ postId: 1, userId: 1 }, { unique: true });
// The feed's question: which of these have I already seen, and when?
postViewSchema.index({ userId: 1, postId: 1 });

export const PostView = mongoose.model("PostViews", postViewSchema);
