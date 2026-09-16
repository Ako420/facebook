import {
  createCommentService,
  listCommentsService,
  deleteCommentService,
  setReactionService,
  removeReactionService,
} from "../service/engagementService.js";

/** Shapes a comment for the client, with its author inlined. */
const publicComment = (comment) => {
  const author = comment.userId && typeof comment.userId === "object" ? comment.userId : null;

  return {
    id: comment._id,
    content: comment.content,
    createdAt: comment.createdAt,
    author: author
      ? { id: author._id, name: author.name, avatarUrl: author.avatarUrl }
      : { id: comment.userId },
  };
};

/** POST /api/comment/:postId */
export const createComment = async (req, res, next) => {
  const { commentText } = req.body;
  try {
    const comment = await createCommentService(
      req.params.postId,
      req.user._id,
      commentText,
    );

    return res.status(201).json({
      message: "Comment created successfully",
      comment: publicComment(comment.toObject()),
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/comment/:postId */
export const listComments = async (req, res, next) => {
  try {
    const comments = await listCommentsService(req.params.postId);

    return res.status(200).json({ comments: comments.map(publicComment) });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/comment/:commentId */
export const deleteComment = async (req, res, next) => {
  try {
    await deleteCommentService(req.params.commentId, req.user._id);

    return res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/posts/:postId/reaction — body { type: 1-10 } */
export const setReaction = async (req, res, next) => {
  try {
    const reactions = await setReactionService(
      req.params.postId,
      req.user._id,
      req.body?.type,
    );

    return res.status(200).json({ message: "Reaction saved.", reactions });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/posts/:postId/reaction */
export const removeReaction = async (req, res, next) => {
  try {
    const reactions = await removeReactionService(req.params.postId, req.user._id);

    return res.status(200).json({ message: "Reaction removed.", reactions });
  } catch (error) {
    next(error);
  }
};
