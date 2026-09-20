import { api } from "../../lib/api";
import { avatarOf } from "../../lib/images";
import type { MediaItem, Post, ReactionCounts, ReactionType, Reel } from "../../lib/types";
import { reactionFromCode } from "./engagementApi";
import type { ApiReactions } from "./engagementApi";

export interface UploadedMedia {
  type: "image" | "video";
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  poster?: string;
  durationSec?: number;
}

export interface ApiPost {
  id: string;
  type: "post" | "reel";
  title: string;
  description: string;
  imageUrl: string[];
  videoUrl: string[];
  likeCount: number;
  commentCount: number;
  /** Per-type tallies plus this viewer's own pick. */
  reactions?: ApiReactions;
  /** Set when the post lives in a group; null on the main feed. */
  groupId?: string | null;
  createdAt: string;
  author: { id: string; name?: string; avatarUrl?: string };
  /** True when this person has already had it in front of them. */
  seen?: boolean;
}

export interface PostFeed {
  posts: ApiPost[];
  /** True once the feed has run out of new posts and started repeating. */
  caughtUp: boolean;
}

export const uploadMedia = async (
  files: File[],
  onProgress?: (percent: number) => void,
) => {
  const form = new FormData();
  files.forEach((file) => form.append("media", file));

  const { data } = await api.post<{ media: UploadedMedia[] }>("/upload", form, {
    headers: { "Content-Type": undefined },
    onUploadProgress: (event) => {
      if (!onProgress) return;
      const total = event.total ?? 0;
      if (total > 0) onProgress(Math.round((event.loaded / total) * 100));
    },
  });

  return data.media;
};

export const discardUploads = async (publicIds: string[]) => {
  if (publicIds.length === 0) return;
  await api.delete("/upload", { data: { publicIds } });
};

export const createPost = async (body: {
  title: string;
  imageUrl: string[];
  videoUrl: string[];
  type?: "post" | "reel";
  groupId?: string;
}) => {
  const { data } = await api.post<{ post: ApiPost }>("/posts", body);
  return data.post;
};

export const listPosts = async (params?: {
  userId?: string;
  type?: "post" | "reel";
  groupId?: string;
  limit?: number;
}) => {
  const { data } = await api.get<PostFeed>("/posts", { params });
  return data;
};

/** Tells the server which posts have been seen, so the next load brings new ones. */
export const markPostsViewed = async (postIds: string[]) => {
  const { data } = await api.post<{ added: number }>("/posts/views", { postIds });
  return data.added;
};

export const getPost = async (id: string) => {
  const { data } = await api.get<{ post: ApiPost }>(`/posts/${id}`);
  return data.post;
};

export const updatePost = async (id: string, body: { title: string }) => {
  const { data } = await api.patch<{ post: ApiPost }>(`/posts/${id}`, body);
  return data.post;
};

export const deletePost = async (id: string) => {
  await api.delete(`/posts/${id}`);
};

/** Turns the server's numeric tallies into the name-keyed map the UI renders. */
export function toReactionCounts(reactions?: ApiReactions): ReactionCounts {
  const counts: ReactionCounts = {};
  if (!reactions) return counts;

  for (const [code, total] of Object.entries(reactions.counts)) {
    const name = reactionFromCode(Number(code));
    if (name) counts[name as ReactionType] = total;
  }

  return counts;
}

export function toFeedPost(post: ApiPost): Post {
  const videos: MediaItem[] = post.videoUrl.map((url) => ({
    type: "video",
    url,
    alt: post.title,
    width: 1280,
    height: 720,
  }));

  const images: MediaItem[] = post.imageUrl.map((url) => ({
    type: "image",
    url,
    alt: post.title,
    width: 900,
    height: 600,
  }));

  return {
    id: post.id,
    author: {
      id: post.author.id,
      name: post.author.name ?? "Unknown",
      avatar: avatarOf(post.author.avatarUrl),
      isVerified: false,
      kind: "user",
    },
    createdAt: post.createdAt,
    privacy: "public",
    text: post.title,
    media: [...videos, ...images],
    reactions: toReactionCounts(post.reactions),
    commentCount: post.commentCount,
    shareCount: 0,
    comments: [],
    viewerReaction: reactionFromCode(post.reactions?.viewerReaction),
    isSaved: false,
  };
}

export function toReel(post: ApiPost): Reel {
  const feed = toFeedPost(post);

  const url = post.videoUrl[0] ?? "";
  const video: MediaItem = {
    type: "video",
    url,
    // Cloudinary renders a still from any video when you ask for .jpg.
    poster: url.replace(/\.[a-z0-9]+$/i, ".jpg"),
    alt: post.title,
    width: 720,
    height: 1280,
  };

  return {
    id: post.id,
    author: feed.author,
    caption: post.title,
    video,
    audio: { title: "Original audio", artist: feed.author.name },
    durationSec: 0,
    viewCount: 0,
    likeCount: post.reactions?.total ?? 0,
    commentCount: post.commentCount,
    shareCount: 0,
    viewerLiked: Boolean(post.reactions?.viewerReaction),
    isFollowingAuthor: false,
    createdAt: post.createdAt,
  };
}
