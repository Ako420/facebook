import { Story, STORY_LIFETIME_MS } from "../model/story.js";
import { StoryView } from "../model/storyView.js";
import { Friend } from "../model/friend.js";
import { ApiError } from "../utils/apiError.js";
import { isValidObjectId } from "../utils/validators.js";
import { claimUploads, destroyMedia } from "./uploadService.js";

const USER_FIELDS = "name avatarUrl";
const MAX_TEXT = 250;

const same = (a, b) => String(a) === String(b);

const requireId = (id, label = "story") => {
  if (!isValidObjectId(id)) throw ApiError.badRequest(`Invalid ${label} id.`);
};

/** Only stories that have not run out yet. */
const live = () => ({ expiresAt: { $gt: new Date() } });

/**
 * Whose stories you may see: your own, and those of people you are actually
 * friends with.
 */
export const visibleAuthorIds = async (userId) => {
  const rows = await Friend.find({
    status: "accepted",
    $or: [{ userId }, { friendId: userId }],
  })
    .select("userId friendId")
    .lean();

  const ids = new Set([String(userId)]);
  for (const row of rows) {
    ids.add(String(row.userId));
    ids.add(String(row.friendId));
  }

  return [...ids];
};

const normalizeMedia = (media) => {
  if (!media || typeof media !== "object") return null;

  const url = typeof media.url === "string" ? media.url.trim() : "";
  if (!url) return null;
  if (media.type !== "image" && media.type !== "video") return null;

  return {
    type: media.type,
    url,
    publicId: media.publicId,
    width: media.width,
    height: media.height,
    poster: media.poster,
    durationSec: media.durationSec,
  };
};

export const createStoryService = async (userId, body) => {
  const { media, text, background } = body || {};

  const caption = typeof text === "string" ? text.trim() : "";
  if (caption.length > MAX_TEXT) {
    throw ApiError.badRequest("Please correct the highlighted fields.", {
      text: `A story can carry at most ${MAX_TEXT} characters.`,
    });
  }

  const file = normalizeMedia(media);

  if (!file && !caption) {
    throw ApiError.badRequest("Add a photo, a video, or something to say.", {
      media: "A story needs a picture or some words.",
    });
  }

  const story = await Story.create({
    userId,
    type: file ? file.type : "text",
    media: file ?? undefined,
    text: caption,
    background: file
      ? undefined
      : typeof background === "string"
        ? background.trim()
        : undefined,
    expiresAt: new Date(Date.now() + STORY_LIFETIME_MS),
  });

  if (file) await claimUploads([file], userId);

  return story;
};


export const listStoriesService = async (userId) => {
  const authors = await visibleAuthorIds(userId);

  const stories = await Story.find({ userId: { $in: authors }, ...live() })
    .sort({ createdAt: 1 })
    .populate("userId", USER_FIELDS)
    .lean();

  if (stories.length === 0) return [];

  const seen = new Set(
    (
      await StoryView.find({
        userId,
        storyId: { $in: stories.map((row) => row._id) },
      })
        .select("storyId")
        .lean()
    ).map((row) => String(row.storyId)),
  );

  const groups = new Map();

  for (const story of stories) {
    if (!story.userId) continue;

    const key = String(story.userId._id);
    if (!groups.has(key)) {
      groups.set(key, {
        author: story.userId,
        isViewer: same(story.userId._id, userId),
        items: [],
        hasUnseen: false,
        latestAt: story.createdAt,
      });
    }

    const group = groups.get(key);
    const wasSeen = seen.has(String(story._id));

    group.items.push({ ...story, seen: wasSeen });
    if (!wasSeen) group.hasUnseen = true;
    if (story.createdAt > group.latestAt) group.latestAt = story.createdAt;
  }

  return [...groups.values()].sort((a, b) => {
    if (a.isViewer !== b.isViewer) return a.isViewer ? -1 : 1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    return Date.parse(b.latestAt) - Date.parse(a.latestAt);
  });
};

/** A story you are allowed to open: live, and by someone whose stories you see. */
const requireVisibleStory = async (storyId, userId) => {
  requireId(storyId);

  const story = await Story.findOne({ _id: storyId, ...live() });
  if (!story) throw ApiError.notFound("That story is no longer available.");

  const authors = await visibleAuthorIds(userId);
  if (!authors.some((id) => same(id, story.userId))) {
    throw ApiError.notFound("That story is no longer available.");
  }

  return story;
};

/**
 * Opening someone's story counts once. Your own does not count at all — the
 * number is meant to say how many other people looked.
 */
export const markViewedService = async (storyId, userId) => {
  const story = await requireVisibleStory(storyId, userId);

  if (same(story.userId, userId)) return { story, counted: false };

  try {
    await StoryView.create({ storyId: story._id, userId });
  } catch (error) {
    // The unique index means a second look is simply not a second view.
    if (error?.code === 11000) return { story, counted: false };
    throw error;
  }

  await Story.updateOne({ _id: story._id }, { $inc: { viewCount: 1 } });

  return { story, counted: true };
};

/** Only the person who posted it gets to ask. */
export const listViewersService = async (storyId, userId, { limit = 50 } = {}) => {
  requireId(storyId);

  const story = await Story.findById(storyId);
  if (!story) throw ApiError.notFound("That story is no longer available.");

  if (!same(story.userId, userId)) {
    throw ApiError.forbidden("Only the person who posted a story can see who watched it.");
  }

  const rows = await StoryView.find({ storyId: story._id })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 50, 100))
    .populate("userId", USER_FIELDS)
    .lean();

  return { story, viewers: rows.filter((row) => row.userId) };
};

export const deleteStoryService = async (storyId, userId) => {
  requireId(storyId);

  const story = await Story.findById(storyId);
  if (!story) throw ApiError.notFound("That story is no longer available.");

  if (!same(story.userId, userId)) {
    throw ApiError.forbidden("You can only delete your own stories.");
  }

  await StoryView.deleteMany({ storyId: story._id });
  await story.deleteOne();

  if (story.media) await destroyMedia([story.media]);

  return story;
};

/**
 * Clears out stories that have run their day, and the files with them. 
 */
export const sweepExpiredStories = async ({ limit = 500 } = {}) => {
  const expired = await Story.find({ expiresAt: { $lte: new Date() } })
    .limit(limit)
    .lean();

  if (expired.length === 0) return { removed: 0, filesDestroyed: 0, filesFailed: 0 };

  const ids = expired.map((row) => row._id);

  await StoryView.deleteMany({ storyId: { $in: ids } });
  await Story.deleteMany({ _id: { $in: ids } });

  const files = expired.map((row) => row.media).filter(Boolean);
  const { destroyed, failed } = await destroyMedia(files);

  return { removed: expired.length, filesDestroyed: destroyed, filesFailed: failed };
};

/** A person's own live stories, for their profile. */
export const listMyStoriesService = async (userId) =>
  Story.find({ userId, ...live() })
    .sort({ createdAt: -1 })
    .lean();
