import { Post } from "../model/post.js";
import { ApiError } from "../utils/apiError.js";
import { assertCanPostInGroup, assertCanReadGroup } from "./groupService.js";
import { claimUploads, destroyMediaUrls } from "./uploadService.js";

const toNumber = (value) =>
  value === undefined || value === null || value === "" ? undefined : Number(value);

const normalizeUrls = (value) => {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .filter((url) => typeof url === "string")
    .map((url) => url.trim())
    .filter(Boolean);
};

export const createPostService = async (userId, body) => {
  const { title, description, imageUrl, videoUrl, type, groupId } = body || {};

  const images = normalizeUrls(imageUrl);
  const videos = normalizeUrls(videoUrl);
  const text = typeof title === "string" ? title.trim() : "";
  const kind = type === "reel" ? "reel" : "post";

  if (kind === "reel" && videos.length !== 1) {
    throw ApiError.badRequest("A reel needs exactly one video.", {
      videoUrl: "Add one video to publish a reel.",
    });
  }

  if (kind === "post" && !text && images.length === 0 && videos.length === 0) {
    throw ApiError.badRequest("Please write something or add a photo or video.", {
      title: "Write something to post.",
    });
  }

  // You have to belong to a group to post in it.
  if (groupId) await assertCanPostInGroup(groupId, userId);

  const post = await Post.create({
    userId,
    groupId: groupId || null,
    type: kind,
    title: text,
    description: typeof description === "string" ? description.trim() : "",
    imageUrl: kind === "reel" ? [] : images,
    videoUrl: videos,
  });

  await claimUploads([...post.imageUrl, ...post.videoUrl], userId);

  return post;
};


export const listPostsService = async ({ limit = 20, userId, type, groupId, viewerId } = {}) => {
  if (groupId) await assertCanReadGroup(groupId, viewerId);

  const query = type === "reel" ? { type: "reel" } : { type: { $ne: "reel" } };
  if (userId) query.userId = userId;
  query.groupId = groupId || null;

  return Post.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 20, 50))
    .populate("userId", "name avatarUrl")
    .lean();
};

export const updatePost = async (id, body, ownerId) => {
  if (!id) throw ApiError.badRequest("Invalid Post id");

  const { title, description } = body || {};

  const post = await Post.findById(id);
  if (!post) throw ApiError.notFound("Post not found");

  // Ownership is checked before anything changes.
  if (ownerId && String(post.userId) !== String(ownerId)) {
    throw ApiError.forbidden("You can only edit your own posts.");
  }

  if (title !== undefined) post.title = String(title).trim();
  if (description !== undefined) post.description = String(description).trim();

 
  if (!post.title && post.imageUrl.length === 0 && post.videoUrl.length === 0) {
    throw ApiError.badRequest("A post needs text, a photo or a video.", {
      title: "Write something to keep this post.",
    });
  }

  await post.save();
  return post;
};

export const deletePost = async (id, ownerId) => {
  if (!id) throw ApiError.badRequest("Invalid Post id");

  const post = await Post.findById(id);

  if (!post) {
    throw ApiError.notFound("Post not found");
  }

  if (ownerId && String(post.userId) !== String(ownerId)) {
    throw ApiError.forbidden("You can only delete your own posts.");
  }

  await post.deleteOne();

  // The post is gone either way; a provider that is down must not undo that.
  await destroyMediaUrls([...(post.imageUrl || []), ...(post.videoUrl || [])]);

  return post;
};

export const updatePostCommentCount = async (id, commentCount) => {
  const count = toNumber(commentCount);

  if (!id) throw ApiError.badRequest("inValid post id");

  if (count === undefined || Number.isNaN(count) || count < 0) {
    throw ApiError.badRequest("Please enter a valid comment count", {
      commentCount: "Comment count must be 0 or more.",
    });
  }

  const post = await Post.findByIdAndUpdate(id, { commentCount: count }, { new: true });

  if (!post) throw ApiError.notFound("Post not found");

  return post;
};


export const updatePOstLikeCount = async (id, likeCount) => {
  const count = toNumber(likeCount);

  if (!id) throw ApiError.badRequest("inValid post id");

  if (count === undefined || Number.isNaN(count) || count < 0) {
    throw ApiError.badRequest("Please enter a valid like count", {
      likeCount: "Like count must be 0 or more.",
    });
  }

  const post = await Post.findByIdAndUpdate(id, { likeCount: count }, { new: true });

  if (!post) throw ApiError.notFound("Post not found");

  return post;
};
