import {
  createStoryService,
  deleteStoryService,
  listMyStoriesService,
  listStoriesService,
  listViewersService,
  markViewedService,
} from '../service/storyService.js';

const publicAuthor = (user) =>
  user && typeof user === 'object'
    ? { id: user._id, name: user.name, avatarUrl: user.avatarUrl }
    : { id: user };

/**
 * How many people watched is the author's business, so it only travels on
 * their own stories.
 */
const publicStory = (story, { mine, seen }) => ({
  id: story._id,
  type: story.type,
  text: story.text ?? '',
  background: story.background ?? null,
  media: story.media ?? null,
  createdAt: story.createdAt,
  expiresAt: story.expiresAt,
  seen: Boolean(seen),
  ...(mine ? { viewCount: story.viewCount ?? 0 } : {}),
});

/** GET /api/stories */
export const listStories = async (req, res, next) => {
  try {
    const groups = await listStoriesService(req.user._id);

    return res.status(200).json({
      stories: groups.map((group) => ({
        author: publicAuthor(group.author),
        isViewer: group.isViewer,
        hasUnseen: group.hasUnseen,
        latestAt: group.latestAt,
        items: group.items.map((story) =>
          publicStory(story, { mine: group.isViewer, seen: story.seen }),
        ),
      })),
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/stories/mine */
export const listMyStories = async (req, res, next) => {
  try {
    const stories = await listMyStoriesService(req.user._id);

    return res.status(200).json({
      stories: stories.map((story) => publicStory(story, { mine: true, seen: true })),
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/stories */
export const createStory = async (req, res, next) => {
  try {
    const story = await createStoryService(req.user._id, req.body);

    return res.status(201).json({
      message: 'Story shared.',
      story: publicStory(story.toObject(), { mine: true, seen: true }),
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/stories/:id/views */
export const markStoryViewed = async (req, res, next) => {
  try {
    const { story, counted } = await markViewedService(req.params.id, req.user._id);

    return res.status(200).json({
      message: counted ? 'Marked as seen.' : 'Already seen.',
      counted,
      viewCount: String(story.userId) === String(req.user._id) ? story.viewCount : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/stories/:id/views */
export const listStoryViewers = async (req, res, next) => {
  try {
    const { story, viewers } = await listViewersService(req.params.id, req.user._id, {
      limit: req.query.limit,
    });

    return res.status(200).json({
      viewCount: story.viewCount ?? 0,
      viewers: viewers.map((row) => ({
        id: row._id,
        seenAt: row.createdAt,
        user: publicAuthor(row.userId),
      })),
    });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/stories/:id */
export const removeStory = async (req, res, next) => {
  try {
    await deleteStoryService(req.params.id, req.user._id);

    return res.status(200).json({ message: 'Story deleted.' });
  } catch (error) {
    next(error);
  }
};
