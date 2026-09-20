

export type ID = string;

export type ISODate = string;

export interface User {
  id: ID;
  name: string;
  username: string;
  avatar: string;
  cover: string;
  bio: string;
  location: string;
  work: string;
  isVerified: boolean;
  isOnline: boolean;
  lastActiveAt: ISODate;
  joinedAt: ISODate;
  friendCount: number;
  mutualFriendCount: number;
  isFriend: boolean;
}

export interface Author {
  id: ID;
  name: string;
  avatar: string;
  isVerified: boolean;
  kind: "user" | "page";
}

export interface MediaItem {
  type: "image" | "video";
  url: string;
  poster?: string;
  alt: string;
  width: number;
  height: number;
}

/* ---- Feed ---------------------------------------------------------------- */

export type ReactionType =
  | "like"
  | "love"
  | "care"
  | "haha"
  | "wow"
  | "sad"
  | "angry";

/** Only the reactions a post actually received are listed. */
export type ReactionCounts = Partial<Record<ReactionType, number>>;

export type Privacy = "public" | "friends" | "only-me";

export interface Comment {
  id: ID;
  author: Author;
  text: string;
  createdAt: ISODate;
  likeCount: number;
  viewerLiked: boolean;
  replies: Comment[];
}

export interface LinkPreview {
  url: string;
  domain: string;
  title: string;
  description: string;
  image: string;
}

export interface Post {
  id: ID;
  author: Author;
  createdAt: ISODate;
  privacy: Privacy;
  text: string;
  media: MediaItem[];
  /** CSS background for short text-only posts */
  background?: string;
  link?: LinkPreview;
  feeling?: string;
  location?: string;
  reactions: ReactionCounts;
  commentCount: number;
  shareCount: number;
  comments: Comment[];
  /** null when the current user has not reacted */
  viewerReaction: ReactionType | null;
  isSaved: boolean;
}

export interface Story {
  id: ID;
  author: Author;
  media: MediaItem;
  createdAt: ISODate;
  seen: boolean;
}

export interface Reel {
  id: ID;
  author: Author;
  caption: string;
  video: MediaItem;
  audio: { title: string; artist: string };
  durationSec: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewerLiked: boolean;
  isFollowingAuthor: boolean;
  createdAt: ISODate;
}

/* ---- Friends ------------------------------------------------------------- */

/* ---- Messages ------------------------------------------------------------ */

/* ---- Notifications ------------------------------------------------------- */

/* ---- Groups & marketplace ------------------------------------------------ */

export interface Group {
  id: ID;
  name: string;
  cover: string;
  privacy: "public" | "private";
  memberCount: number;
  postsToday: number;
  lastActiveAt: ISODate;
  unreadCount: number;
  isJoined: boolean;
}

/* ---- Navigation ---------------------------------------------------------- */

export interface NavItem {
  id: ID;
  label: string;
  /** Icon key — map it to whichever icon set you use */
  icon: string;
  href: string;
  badge?: number;
}

