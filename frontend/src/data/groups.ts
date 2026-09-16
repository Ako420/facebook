/* ============================================================================
   Groups page + the groups rail in the sidebar.
   ========================================================================== */

import type { Group, ID } from "./types";
import { photo } from "./media";
import { daysAgo, hoursAgo, minutesAgo } from "./time";

export const groups: Group[] = [
  {
    id: "g1",
    name: "Sunday League Cricket",
    cover: photo("group-sunday", 400, 400),
    privacy: "public",
    memberCount: 12_400,
    postsToday: 18,
    lastActiveAt: minutesAgo(8),
    unreadCount: 5,
    isJoined: true,
  },
  {
    id: "g2",
    name: "Maidan CC — Members Only",
    cover: photo("group-maidan", 400, 400),
    privacy: "private",
    memberCount: 86,
    postsToday: 4,
    lastActiveAt: hoursAgo(1),
    unreadCount: 2,
    isJoined: true,
  },
  {
    id: "g3",
    name: "Test Match Purists",
    cover: photo("group-test", 400, 400),
    privacy: "public",
    memberCount: 204_000,
    postsToday: 231,
    lastActiveAt: minutesAgo(2),
    unreadCount: 0,
    isJoined: true,
  },
  {
    id: "g4",
    name: "Backyard Cricket Memes",
    cover: photo("group-memes", 400, 400),
    privacy: "public",
    memberCount: 512_000,
    postsToday: 890,
    lastActiveAt: minutesAgo(1),
    unreadCount: 12,
    isJoined: true,
  },
  {
    id: "g5",
    name: "Bengaluru Ground Bookings",
    cover: photo("group-bookings", 400, 400),
    privacy: "private",
    memberCount: 3_100,
    postsToday: 7,
    lastActiveAt: hoursAgo(4),
    unreadCount: 0,
    isJoined: false,
  },
  {
    id: "g6",
    name: "Cricket Gear Exchange",
    cover: photo("group-gear", 400, 400),
    privacy: "public",
    memberCount: 44_800,
    postsToday: 62,
    lastActiveAt: daysAgo(1),
    unreadCount: 0,
    isJoined: false,
  },
];

export const joinedGroups: Group[] = groups.filter((g) => g.isJoined);

export const suggestedGroups: Group[] = groups.filter((g) => !g.isJoined);

export const groupById = (id: ID): Group | undefined =>
  groups.find((g) => g.id === id);
