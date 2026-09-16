/* ============================================================================
   Friends page: the list, incoming requests, suggestions, birthdays and the
   online rail in the right column.
   ========================================================================== */

import type { FriendRequest, ID, User } from "./types";
import { currentUser, people, users } from "./users";
import { daysAgo, hoursAgo } from "./time";

export const friends: User[] = people.filter((u) => u.isFriend);

/** Right-hand contacts rail — online first, then most recently active. */
export const contacts: User[] = [...friends].sort(
  (a, b) =>
    Number(b.isOnline) - Number(a.isOnline) ||
    Date.parse(b.lastActiveAt) - Date.parse(a.lastActiveAt),
);

export const onlineFriends: User[] = friends.filter((u) => u.isOnline);

export const friendRequests: FriendRequest[] = [
  {
    id: "fr1",
    user: users.arjun,
    sentAt: hoursAgo(2),
    mutualFriendCount: users.arjun.mutualFriendCount,
  },
  {
    id: "fr2",
    user: users.sana,
    sentAt: daysAgo(1),
    mutualFriendCount: users.sana.mutualFriendCount,
  },
];

/** People You May Know. Reuses friends-of-friends with high mutual counts. */
export const friendSuggestions: User[] = [
  users.dev,
  users.zoya,
  users.tara,
  users.ishaan,
].map((u) => ({ ...u, isFriend: false }));

export const birthdaysToday: User[] = [users.priya, users.kabir, users.meera];

/** "Anushka and 2 others have birthdays today." */
export const birthdaySummary = (list: User[] = birthdaysToday): string => {
  const [first, ...rest] = list;
  if (!first) return "No birthdays today.";
  const name = first.name.split(" ")[0];
  if (rest.length === 0) return `${name} has a birthday today.`;
  return `${name} and ${rest.length} ${
    rest.length === 1 ? "other has" : "others have"
  } birthdays today.`;
};

export const mutualFriendsWith = (userId: ID): User[] => {
  const target = people.find((u) => u.id === userId);
  if (!target) return [];
  return friends
    .filter((u) => u.id !== userId && u.id !== currentUser.id)
    .slice(0, target.mutualFriendCount);
};
