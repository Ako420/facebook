import { avatar, photo } from "../../data";
import type { User } from "../../data";
import type { AuthUser } from "./authApi";

/** Stable stand-in face for an account with no photo of its own. */
const seedFrom = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 997;
  return hash;
};


export function toProfileUser(account: AuthUser): User {
  const place = [account.location?.city, account.location?.country]
    .filter(Boolean)
    .join(", ");

  return {
    id: account.id,
    name: account.name,
    username: account.name.toLowerCase().replace(/\s+/g, "."),
    avatar: account.avatarUrl || avatar(seedFrom(account.id)),
    cover: account.profileUrl || photo(`${account.id}-cover`, 1200, 400),
    bio: account.intro ?? "",
    location: place,
    work: account.work ?? "",
    isVerified: false,
    isOnline: true,
    lastActiveAt: new Date().toISOString(),
    joinedAt: account.createdAt ?? new Date().toISOString(),
    friendCount: account.friendsCount ?? 0,
    mutualFriendCount: 0,
    isFriend: false,
  };
}
