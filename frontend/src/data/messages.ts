/* ============================================================================
   Messenger: conversation list + full thread for each one.
   Threads are stored oldest-first, which is the order they render in.
   ========================================================================== */

import type { Conversation, ID, Message, User } from "./types";
import { photo } from "./media";
import { currentUser, userById, users } from "./users";
import { daysAgo, hoursAgo, minutesAgo } from "./time";

const me = currentUser.id;

export const conversations: Conversation[] = [
  {
    id: "cv1",
    isGroup: false,
    participantIds: [me, users.kabir.id],
    unreadCount: 2,
    isMuted: false,
    isTyping: true,
    messages: [
      {
        id: "m1",
        conversationId: "cv1",
        senderId: users.kabir.id,
        text: "Nets tonight? Ground is free after 6.",
        createdAt: hoursAgo(3),
        status: "read",
      },
      {
        id: "m2",
        conversationId: "cv1",
        senderId: me,
        text: "Yes. I'll bring the new ball, mine is shot.",
        createdAt: hoursAgo(3),
        status: "read",
      },
      {
        id: "m3",
        conversationId: "cv1",
        senderId: users.kabir.id,
        text: "Bring two, Ishaan will lose one in the trees again",
        createdAt: minutesAgo(18),
        status: "delivered",
        reactions: { [me]: "😂" },
      },
      {
        id: "m4",
        conversationId: "cv1",
        senderId: users.kabir.id,
        text: "6:15 then?",
        createdAt: minutesAgo(4),
        status: "delivered",
      },
    ],
  },
  {
    id: "cv2",
    isGroup: true,
    name: "Sunday XI",
    avatar: photo("chat-sunday-xi", 200, 200),
    participantIds: [
      me,
      users.rohan.id,
      users.zoya.id,
      users.tara.id,
      users.ishaan.id,
    ],
    unreadCount: 7,
    isMuted: false,
    isTyping: false,
    messages: [
      {
        id: "m5",
        conversationId: "cv2",
        senderId: users.tara.id,
        text: "Team sheet for Sunday is up. Check you're on it.",
        createdAt: hoursAgo(9),
        status: "read",
      },
      {
        id: "m6",
        conversationId: "cv2",
        senderId: users.zoya.id,
        text: "Batting at 8 again. Bold call.",
        createdAt: hoursAgo(8),
        status: "read",
      },
      {
        id: "m7",
        conversationId: "cv2",
        senderId: users.rohan.id,
        text: "You averaged 4 last season",
        createdAt: hoursAgo(8),
        status: "read",
        reactions: { [users.tara.id]: "😂", [users.ishaan.id]: "💀" },
      },
      {
        id: "m8",
        conversationId: "cv2",
        senderId: me,
        text: "Toss is at 9:30, please be early for once.",
        createdAt: hoursAgo(7),
        status: "read",
      },
      {
        id: "m9",
        conversationId: "cv2",
        senderId: users.ishaan.id,
        text: "",
        media: {
          type: "image",
          url: photo("chat-teamsheet", 600, 800),
          alt: "Photo of the handwritten team sheet",
          width: 600,
          height: 800,
        },
        createdAt: hoursAgo(2),
        status: "delivered",
      },
    ],
  },
  {
    id: "cv3",
    isGroup: false,
    participantIds: [me, users.neha.id],
    unreadCount: 0,
    isMuted: false,
    isTyping: false,
    messages: [
      {
        id: "m10",
        conversationId: "cv3",
        senderId: me,
        text: "The album from Sunday is incredible. Can I use one for the club page?",
        createdAt: daysAgo(1),
        status: "read",
      },
      {
        id: "m11",
        conversationId: "cv3",
        senderId: users.neha.id,
        text: "Of course. Credit me and it's yours.",
        createdAt: daysAgo(1),
        status: "read",
        reactions: { [me]: "❤️" },
      },
      {
        id: "m12",
        conversationId: "cv3",
        senderId: users.neha.id,
        text: "Sending the full res files tonight.",
        createdAt: hoursAgo(22),
        status: "read",
      },
    ],
  },
  {
    id: "cv4",
    isGroup: false,
    participantIds: [me, users.priya.id],
    unreadCount: 1,
    isMuted: true,
    isTyping: false,
    messages: [
      {
        id: "m13",
        conversationId: "cv4",
        senderId: users.priya.id,
        text: "Sent you the scorecard mockups — the dark one is my favourite.",
        createdAt: hoursAgo(30),
        status: "delivered",
      },
    ],
  },
  {
    id: "cv5",
    isGroup: false,
    participantIds: [me, users.dev.id],
    unreadCount: 0,
    isMuted: false,
    isTyping: false,
    messages: [
      {
        id: "m14",
        conversationId: "cv5",
        senderId: users.dev.id,
        text: "Pitch will take spin from day two. You have been warned.",
        createdAt: daysAgo(4),
        status: "read",
      },
      {
        id: "m15",
        conversationId: "cv5",
        senderId: me,
        text: "You say that every week",
        createdAt: daysAgo(4),
        status: "read",
      },
    ],
  },
];

/* ---- Helpers the chat UI needs ------------------------------------------- */

export const lastMessage = (c: Conversation): Message | undefined =>
  c.messages[c.messages.length - 1];

/** Everyone in the thread except the signed-in user. */
export const otherParticipants = (c: Conversation): User[] =>
  c.participantIds
    .filter((id) => id !== currentUser.id)
    .map((id) => userById(id))
    .filter((u): u is User => Boolean(u));

export const conversationTitle = (c: Conversation): string =>
  c.name ?? otherParticipants(c)[0]?.name ?? "Unknown";

export const conversationAvatar = (c: Conversation): string =>
  c.avatar ?? otherParticipants(c)[0]?.avatar ?? "";

export const isSentByMe = (m: Message): boolean => m.senderId === currentUser.id;

export const conversationById = (id: ID): Conversation | undefined =>
  conversations.find((c) => c.id === id);

/** Most recent thread first — the order the inbox lists them in. */
export const inbox: Conversation[] = [...conversations].sort((a, b) => {
  const at = lastMessage(a)?.createdAt ?? "";
  const bt = lastMessage(b)?.createdAt ?? "";
  return Date.parse(bt) - Date.parse(at);
});

export const unreadMessageCount: number = conversations.reduce(
  (sum, c) => sum + c.unreadCount,
  0,
);
