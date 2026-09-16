import { Post } from "../model/post.js";
import { Comment } from "../model/comment.js";
import { ApiError } from "../utils/apiError.js";

/* ---- Comments ------------------------------------------------------------ */

export const createCommentService = async (postId, userId, commentText) => {
  if (!postId) throw ApiError.badRequest("Invalid Post id");
  if (!userId) throw ApiError.badRequest("Invalid User id");

  const content = typeof commentText === "string" ? commentText.trim() : "";
  if (!content) {
    throw ApiError.badRequest("Write something before posting.", {
      commentText: "Comment cannot be empty.",
    });
  }

  const post = await Post.findById(postId);
  if (!post) throw ApiError.notFound("Post not found");

  const comment = await Comment.create({ userId, postId, content });

  post.commentCount = (post.commentCount || 0) + 1;
  await post.save();

  await comment.populate("userId", "name avatarUrl");
  return comment;
};

export const deleteCommentService = async (commentId, userId) => {
  if (!commentId) throw ApiError.badRequest("Invalid Comment id");
  if (!userId) throw ApiError.badRequest("Invalid User id");

  const comment = await Comment.findById(commentId);
  if (!comment) throw ApiError.notFound("Comment not found");

  if (String(comment.userId) !== String(userId)) {
    throw ApiError.forbidden("You can only delete your own comments.");
  }

  await comment.deleteOne();

  const post = await Post.findByIdAndUpdate(
    comment.postId,
    { $inc: { commentCount: -1 } },
    { new: true },
  );

  if (post && post.commentCount < 0) {
    post.commentCount = 0;
    await post.save();
  }

  return comment;
};

export const listCommentsService = async (postId) => {
  if (!postId) throw ApiError.badRequest("Invalid Post id");
  return Comment.find({ postId })
    .populate("userId", "name avatarUrl")
    .sort({ createdAt: 1 })
    .lean();
};

/* ---- Reactions ----------------------------------------------------------- */


export const REACTION_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const summarizeReactions = (post, viewerId) => {
  const list = Array.isArray(post.reaction) ? post.reaction : [];

  const counts = {};
  let viewerReaction = null;

  for (const entry of list) {
    if (!entry || entry.type === undefined || entry.type === null) continue;
    counts[entry.type] = (counts[entry.type] || 0) + 1;
    if (viewerId && String(entry.userId) === String(viewerId)) {
      viewerReaction = entry.type;
    }
  }

  return { counts, total: list.length, viewerReaction };
};

export const setReactionService = async (postId, userId, rawType) => {
  if (!postId) throw ApiError.badRequest("Invalid Post id");
  if (!userId) throw ApiError.badRequest("Invalid User id");

  const type = Number(rawType);
  if (!REACTION_VALUES.includes(type)) {
    throw ApiError.badRequest("That reaction is not recognised.", {
      type: "Reaction must be a number between 1 and 10.",
    });
  }

  const post = await Post.findById(postId);
  if (!post) throw ApiError.notFound("Post not found");

  const existing = post.reaction.find((entry) => String(entry.userId) === String(userId));

  if (existing) {
    existing.type = type;
  } else {
    post.reaction.push({ userId, type });
  }

  
  post.likeCount = post.reaction.length;
  await post.save();

  return summarizeReactions(post, userId);
};

export const removeReactionService = async (postId, userId) => {
  if (!postId) throw ApiError.badRequest("Invalid Post id");
  if (!userId) throw ApiError.badRequest("Invalid User id");

  const post = await Post.findById(postId);
  if (!post) throw ApiError.notFound("Post not found");

  post.reaction = post.reaction.filter(
    (entry) => String(entry.userId) !== String(userId),
  );

  post.likeCount = post.reaction.length;
  await post.save();

  return summarizeReactions(post, userId);
};
