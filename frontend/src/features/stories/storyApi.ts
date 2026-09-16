import { api } from "../../lib/api";
import type { UploadedMedia } from "../posts/postApi";

/** A story as storyController's publicStory() returns it. */
export interface ApiStory {
  id: string;
  type: "image" | "video" | "text";
  text: string;
  background: string | null;
  media: UploadedMedia | null;
  createdAt: string;
  expiresAt: string;
  seen: boolean;
  /** Your own stories only — absent on everyone else's. */
  viewCount?: number;
}

/** One person's live stories, which is how the rail renders them. */
export interface ApiStoryGroup {
  author: { id: string; name?: string; avatarUrl?: string };
  isViewer: boolean;
  hasUnseen: boolean;
  latestAt: string;
  /** Oldest first — the order they play in. */
  items: ApiStory[];
}

export interface ApiStoryViewer {
  id: string;
  seenAt: string;
  user: { id: string; name?: string; avatarUrl?: string };
}

export interface StoryDraft {
  media?: UploadedMedia;
  text?: string;
  background?: string;
}

/** You and your friends, grouped by author, you first. */
export const listStories = async () => {
  const { data } = await api.get<{ stories: ApiStoryGroup[] }>("/stories");
  return data.stories;
};

export const listMyStories = async () => {
  const { data } = await api.get<{ stories: ApiStory[] }>("/stories/mine");
  return data.stories;
};

export const createStory = async (body: StoryDraft) => {
  const { data } = await api.post<{ story: ApiStory }>("/stories", body);
  return data.story;
};

/** Call it when a story opens. One view per person, however many times. */
export const markStorySeen = async (id: string) => {
  await api.post(`/stories/${id}/views`);
};

export const listStoryViewers = async (id: string) => {
  const { data } = await api.get<{ viewCount: number; viewers: ApiStoryViewer[] }>(
    `/stories/${id}/views`,
  );
  return data;
};

export const deleteStory = async (id: string) => {
  await api.delete(`/stories/${id}`);
};

/** The backgrounds offered when a story has no picture. */
export const STORY_BACKGROUNDS = [
  "linear-gradient(135deg, #1877f2, #0b5cbf)",
  "linear-gradient(135deg, #f5576c, #f093fb)",
  "linear-gradient(135deg, #0ba360, #3cba92)",
  "linear-gradient(135deg, #f7971e, #ffd200)",
  "linear-gradient(135deg, #4b1248, #f0c27b)",
  "linear-gradient(135deg, #232526, #414345)",
];

/** What the rail shows on a card when there is no picture behind it. */
export const storyPoster = (story: ApiStory) =>
  story.media?.poster || (story.media?.type === "image" ? story.media.url : null);

/** How long a story has left, in words. */
export const timeLeft = (story: ApiStory) => {
  const ms = Date.parse(story.expiresAt) - Date.now();
  if (ms <= 0) return "Expired";

  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h left`;

  return `${Math.max(1, Math.round(ms / 60_000))}m left`;
};
