import { emitToTopic } from "../lib/realtime.js";
import { publicComment } from "../utils/presenters.js";
import { isValidObjectId } from "../utils/validators.js";

const POST_TOPIC = "post:";

export const postTopic = (postId) => `${POST_TOPIC}${postId}`;

export const postIdFromTopic = (topic) => {
  if (!topic.startsWith(POST_TOPIC)) return null;
  const postId = topic.slice(POST_TOPIC.length);
  return isValidObjectId(postId) ? postId : null;
};

export const announceComment = (postId, comment) =>
  emitToTopic(postTopic(postId), "comment:new", {
    postId: String(postId),
    comment: publicComment(comment),
  });

export const announceCommentRemoved = (postId, commentId) =>
  emitToTopic(postTopic(postId), "comment:deleted", {
    postId: String(postId),
    commentId: String(commentId),
  });

export const announceReactions = (postId, { counts, total }) =>
  emitToTopic(postTopic(postId), "post:reactions", {
    postId: String(postId),
    counts,
    total,
  });
