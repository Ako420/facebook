import { api } from "../../lib/api";
import { avatarOf, coverOf } from "../../lib/images";
import type { User } from "../../lib/types";

/** A person as friendController's publicPerson() returns them. */
/** "MM-DD" for an accepted friend, so a birthday can be spotted without a year. */
export const isBirthdayToday = (birthday?: string | null) => {
  if (!birthday) return false;

  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return birthday === `${month}-${day}`;
};

export interface ApiPerson {
  id: string;
  name?: string;
  avatarUrl?: string;
  work?: string;
  friendsCount?: number;
  online?: boolean;
  lastActiveAt?: string | null;
  /** Month and day of an accepted friend's birthday, never the year. */
  birthday?: string | null;
}

/** One row of the Friend collection, from this viewer's side. */
export interface FriendEdge {
  id: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  user: ApiPerson;
}

export interface FriendLists {
  friends: FriendEdge[];
  incoming: FriendEdge[];
  outgoing: FriendEdge[];
}

export const listFriends = async () => {
  const { data } = await api.get<FriendLists>("/friend/user");
  return data;
};

export const listSuggestions = async (limit = 20) => {
  const { data } = await api.get<{ users: ApiPerson[] }>("/friend/suggestions", {
    params: { limit },
  });
  return data.users;
};

export const sendFriendRequest = async (friendId: string) => {
  const { data } = await api.post<{ message: string }>("/friend", { friendId });
  return data;
};

/** Only the person who received the request may call this. */
export const respondToRequest = async (
  id: string,
  status: "accepted" | "rejected",
) => {
  const { data } = await api.put<{ message: string }>(`/friend/${id}`, { status });
  return data;
};

/** Removes the row entirely — used for unfriend and for cancelling a request. */
export const removeFriend = async (id: string) => {
  await api.delete(`/friend/${id}`);
};

export function toPerson(person: ApiPerson): User {
  return {
    id: person.id,
    name: person.name ?? "Unknown",
    username: (person.name ?? "unknown").toLowerCase().replace(/\s+/g, "."),
    avatar: avatarOf(person.avatarUrl),
    cover: coverOf(),
    bio: "",
    location: "",
    work: person.work ?? "",
    isVerified: false,
    isOnline: false,
    lastActiveAt: new Date().toISOString(),
    joinedAt: new Date().toISOString(),
    friendCount: person.friendsCount ?? 0,
    mutualFriendCount: 0,
    isFriend: false,
  };
}
