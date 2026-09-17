import {
  createPostService,
  getPostService,
  listPostsService,
  markPostsViewedService,
  updatePost as updatePostService,
  deletePost as deletePostService,
} from '../service/postService.js';
import { summarizeReactions } from '../service/engagementService.js';


/** Shapes a stored post for the feed, with its author and reactions inlined. */
const publicPost = (post, viewerId) => {
  const author = post.userId && typeof post.userId === 'object' ? post.userId : null;

  return {
    id: post._id,
    type: post.type || 'post',
    title: post.title,
    description: post.description,
    imageUrl: post.imageUrl ?? [],
    videoUrl: post.videoUrl ?? [],
    likeCount: post.likeCount ?? 0,
    // Counts per reaction type plus whichever one the viewer picked.
    reactions: summarizeReactions(post, viewerId),
    commentCount: post.commentCount ?? 0,
    groupId: post.groupId ?? null,
    seen: Boolean(post.seenAt),
    createdAt: post.createdAt,
    author: author
      ? { id: author._id, name: author.name, avatarUrl: author.avatarUrl }
      : { id: post.userId },
  };
};

/**
 * POST /api/posts  (protected)
 * uploaded Cloudinary URLs from POST /api/upload.
 */
export const createPost = async (req, res, next) => {
  try {
    const post = await createPostService(req.user._id, req.body);
    await post.populate('userId', 'name avatarUrl');

    return res.status(201).json({
      message: 'Post published.',
      post: publicPost(post.toObject(), req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/posts  (protected) */
export const listPosts = async (req, res, next) => {
  try {
    const { posts, caughtUp } = await listPostsService({
      limit: req.query.limit,
      userId: req.query.userId,
      type: req.query.type,
      groupId: req.query.groupId,
      viewerId: req.user._id,
    });

    return res.status(200).json({
      posts: posts.map((post) => publicPost(post, req.user._id)),
      caughtUp,
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/posts/views  (protected) */
export const markPostsViewed = async (req, res, next) => {
  try {
    const body = req.body || {};
    const added = await markPostsViewedService(req.user._id, body.postIds ?? body.postId);

    return res.status(200).json({ message: 'Marked as seen.', added });
  } catch (error) {
    next(error);
  }
};

/** GET /api/posts/:id  (protected) */
export const getPost = async (req, res, next) => {
  try {
    const post = await getPostService(req.params.id, req.user._id);

    return res.status(200).json({ post: publicPost(post, req.user._id) });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/posts/:id  (protected, author only) */
export const editPost = async (req, res, next) => {
  try {
    const post = await updatePostService(req.params.id, req.body, req.user._id);
    await post.populate('userId', 'name avatarUrl');

    return res.status(200).json({
      message: 'Post updated.',
      post: publicPost(post.toObject(), req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/posts/:id  (protected, author only) */
export const removePost = async (req, res, next) => {
  try {
    await deletePostService(req.params.id, req.user._id);

    return res.status(200).json({ message: 'Post deleted.' });
  } catch (error) {
    next(error);
  }
};
