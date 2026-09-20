import { avatarOf, coverOf } from "../../lib/images";
import type { User } from "../../lib/types";
import type { AuthUser } from "./authApi";

export function toProfileUser(account: AuthUser): User {
  const place = [account.location?.city, account.location?.country]
    .filter(Boolean)
    .join(", ");

  return {
    id: account.id,
    name: account.name,
    username: account.name.toLowerCase().replace(/\s+/g, "."),
    avatar: avatarOf(account.avatarUrl),
    cover: coverOf(account.profileUrl),
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
