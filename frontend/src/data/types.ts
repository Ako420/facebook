

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

export interface Page {
  id: ID;
  name: string;
  handle: string;
  avatar: string;
  cover: string;
  category: string;
  followerCount: number;
  unreadCount: number;
  isVerified: boolean;
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

export interface FriendRequest {
  id: ID;
  user: User;
  sentAt: ISODate;
  mutualFriendCount: number;
}

/* ---- Messages ------------------------------------------------------------ */

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export interface Message {
  id: ID;
  conversationId: ID;
  senderId: ID;
  text: string;
  media?: MediaItem;
  createdAt: ISODate;
  status: MessageStatus;
  /** Emoji reactions keyed by the user who left them */
  reactions?: Record<ID, string>;
}

export interface Conversation {
  id: ID;
  isGroup: boolean;
  /** Group chats only — 1:1 chats take their title from the other person */
  name?: string;
  avatar?: string;
  participantIds: ID[];
  messages: Message[];
  unreadCount: number;
  isMuted: boolean;
  isTyping: boolean;
}

/* ---- Notifications ------------------------------------------------------- */

export type NotificationType =
  | "reaction"
  | "comment"
  | "mention"
  | "friend-request"
  | "friend-accepted"
  | "birthday"
  | "group"
  | "event"
  | "memory"
  | "page";

export interface AppNotification {
  id: ID;
  type: NotificationType;
  actor: Author;
  /** Sentence that follows the actor's name */
  body: string;
  href: string;
  createdAt: ISODate;
  isRead: boolean;
}

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

export interface Listing {
  id: ID;
  title: string;
  /** Stored in cents to keep the arithmetic exact */
  priceCents: number;
  currency: string;
  category: string;
  location: string;
  image: string;
  sellerId: ID;
  postedAt: ISODate;
  isSaved: boolean;
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

export interface Shortcut {
  id: ID;
  label: string;
  /** Two-letter fallback shown when there is no image */
  initials: string;
  image?: string;
  href: string;
}
