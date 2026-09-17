import mongoose from "mongoose";
import { Post } from "../model/post.js";
import { PostView } from "../model/postView.js";
import { ApiError } from "../utils/apiError.js";
import { assertCanPostInGroup, assertCanReadGroup } from "./groupService.js";
import { claimUploads, destroyMediaUrls } from "./uploadService.js";
import { retract } from "./notificationService.js";
import { isValidObjectId } from "../utils/validators.js";

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


const objectId = (value) => new mongoose.Types.ObjectId(String(value));

/**
 * Newest first, but anything this person has already seen drops to the back,
 * oldest look first — so a refresh brings new posts up, and once everything
 * has been seen the feed starts again instead of running dry.
 */
export const listPostsService = async ({ limit = 20, userId, type, groupId, viewerId } = {}) => {
  if (groupId) await assertCanReadGroup(groupId, viewerId);

  const match = type === "reel" ? { type: "reel" } : { type: { $ne: "reel" } };
  if (userId) match.userId = objectId(userId);
  match.groupId = groupId ? objectId(groupId) : null;

  const size = Math.min(Number(limit) || 20, 50);

  const posts = await Post.aggregate([
    { $match: match },
    {
      $lookup: {
        from: PostView.collection.name,
        let: { postId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$postId", "$$postId"] }, { $eq: ["$userId", objectId(viewerId)] }],
              },
            },
          },
          { $project: { createdAt: 1 } },
        ],
        as: "views",
      },
    },
    { $addFields: { seenAt: { $arrayElemAt: ["$views.createdAt", 0] } } },
    { $sort: { seenAt: 1, createdAt: -1 } },
    { $limit: size },
    { $project: { views: 0 } },
  ]);

  await Post.populate(posts, { path: "userId", select: "name avatarUrl" });

  return { posts, caughtUp: posts.some((post) => post.seenAt) };
};

const MAX_VIEWS_PER_CALL = 50;

/** Records that these posts have now been in front of this person. */
export const markPostsViewedService = async (userId, postIds) => {
  const wanted = [...new Set((Array.isArray(postIds) ? postIds : [postIds]).map(String))].filter(
    Boolean,
  );
  if (wanted.length === 0) return 0;

  if (wanted.length > MAX_VIEWS_PER_CALL) {
    throw ApiError.badRequest(`You can mark at most ${MAX_VIEWS_PER_CALL} posts at a time.`);
  }

  if (wanted.some((id) => !isValidObjectId(id))) {
    throw ApiError.badRequest("Invalid Post id");
  }

  const seen = await PostView.find({ userId, postId: { $in: wanted } })
    .select("postId")
    .lean();

  const known = new Set(seen.map((row) => String(row.postId)));
  const fresh = wanted.filter((id) => !known.has(id));
  if (fresh.length === 0) return 0;

  try {
    await PostView.insertMany(
      fresh.map((postId) => ({ postId, userId })),
      { ordered: false },
    );
  } catch (error) {
    // Another tab recorded the same look a moment earlier.
    if (error?.code !== 11000) throw error;
  }

  return fresh.length;
};

export const getPostService = async (id, viewerId) => {
  if (!isValidObjectId(id)) throw ApiError.badRequest("Invalid Post id");

  const post = await Post.findById(id).populate("userId", "name avatarUrl").lean();
  if (!post) throw ApiError.notFound("Post not found");

  if (post.groupId) await assertCanReadGroup(post.groupId, viewerId);

  return post;
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
  await retract({ postId: post._id });
  await PostView.deleteMany({ postId: post._id });

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
