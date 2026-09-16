/* ============================================================================
   Notifications dropdown / page.
   `body` is the sentence that follows the actor's name, so the UI renders it as
   <b>{actor.name}</b> {body}.
   ========================================================================== */

import type { AppNotification } from "./types";
import { asAuthor, users } from "./users";
import { asPageAuthor, pages } from "./pages";
import { daysAgo, hoursAgo, minutesAgo } from "./time";

export const notifications: AppNotification[] = [
  {
    id: "n1",
    type: "reaction",
    actor: asAuthor(users.kabir),
    body: "and 24 others reacted to your photo.",
    href: "/posts/p2",
    createdAt: minutesAgo(12),
    isRead: false,
  },
  {
    id: "n2",
    type: "comment",
    actor: asAuthor(users.meera),
    body: 'commented on your post: "Writing this one up tonight."',
    href: "/posts/p1",
    createdAt: hoursAgo(2),
    isRead: false,
  },
  {
    id: "n3",
    type: "friend-request",
    actor: asAuthor(users.arjun),
    body: "sent you a friend request.",
    href: "/friends/requests",
    createdAt: hoursAgo(2),
    isRead: false,
  },
  {
    id: "n4",
    type: "mention",
    actor: asAuthor(users.zoya),
    body: "mentioned you in a comment.",
    href: "/posts/p3",
    createdAt: hoursAgo(6),
    isRead: true,
  },
  {
    id: "n5",
    type: "page",
    actor: asPageAuthor(pages.pitchReport),
    body: "posted a new session report.",
    href: "/posts/p1",
    createdAt: hoursAgo(5),
    isRead: true,
  },
  {
    id: "n6",
    type: "group",
    actor: asAuthor(users.tara),
    body: "posted in Sunday League Cricket.",
    href: "/groups/g1",
    createdAt: hoursAgo(11),
    isRead: true,
  },
  {
    id: "n7",
    type: "birthday",
    actor: asAuthor(users.priya),
    body: "has a birthday today. Write on their timeline.",
    href: "/profile/u4",
    createdAt: hoursAgo(14),
    isRead: true,
  },
  {
    id: "n8",
    type: "friend-accepted",
    actor: asAuthor(users.dev),
    body: "accepted your friend request.",
    href: "/profile/u9",
    createdAt: daysAgo(1),
    isRead: true,
  },
  {
    id: "n9",
    type: "memory",
    actor: asAuthor(users.aarav),
    body: "You have a memory from 3 years ago today.",
    href: "/memories",
    createdAt: daysAgo(1),
    isRead: true,
  },
  {
    id: "n10",
    type: "event",
    actor: asAuthor(users.rohan),
    body: "invited you to Club Awards Night.",
    href: "/events/e1",
    createdAt: daysAgo(2),
    isRead: true,
  },
];

export const unreadNotifications: AppNotification[] = notifications.filter(
  (n) => !n.isRead,
);

export const unreadNotificationCount: number = unreadNotifications.length;
