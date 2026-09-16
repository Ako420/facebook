import type { Author, ID, User } from "./types";
import { avatar, photo } from "./media";
import { daysAgo, hoursAgo, minutesAgo, monthsAgo, yearsAgo } from "./time";

const person = (
  id: ID,
  name: string,
  username: string,
  avatarSeed: number,
  extra: Partial<User> = {},
): User => ({
  id,
  name,
  username,
  avatar: avatar(avatarSeed),
  cover: photo(`${id}-cover`, 1200, 400),
  bio: "",
  location: "Bengaluru, India",
  work: "",
  isVerified: false,
  isOnline: false,
  lastActiveAt: minutesAgo(90),
  joinedAt: yearsAgo(5),
  friendCount: 480,
  mutualFriendCount: 12,
  isFriend: true,
  ...extra,
});

export const users = {
  aarav: person("u1", "Aarav Mehta", "aarav.mehta", 12, {
    bio: "Opening batter for Maidan CC. Weekend nets, weekday spreadsheets.",
    work: "Frontend Developer at Northwind",
    isOnline: true,
    friendCount: 842,
    mutualFriendCount: 0,
    joinedAt: yearsAgo(9),
  }),
  neha: person("u2", "Neha Kulkarni", "neha.kulkarni", 5, {
    bio: "Sports photographer. Ask me about the golden hour at the Chinnaswamy.",
    work: "Photographer at Cover Drive Weekly",
    isOnline: true,
    mutualFriendCount: 24,
  }),
  rohan: person("u3", "Rohan Iyer", "rohan.iyer", 33, {
    bio: "Left-arm spin, right-arm opinions.",
    work: "Analyst at Pitch Report",
    isOnline: true,
    mutualFriendCount: 18,
  }),
  priya: person("u4", "Priya Deshmukh", "priya.deshmukh", 47, {
    bio: "Runs on filter coffee and net sessions.",
    work: "Product Designer at Lumen",
    isOnline: true,
    location: "Pune, India",
    mutualFriendCount: 9,
  }),
  kabir: person("u5", "Kabir Rao", "kabir.rao", 15, {
    bio: "Wicketkeeper. Loud behind the stumps, quiet everywhere else.",
    isOnline: true,
    lastActiveAt: minutesAgo(3),
    mutualFriendCount: 31,
  }),
  ishaan: person("u6", "Ishaan Verma", "ishaan.verma", 60, {
    bio: "Fast bowler in theory, medium pace in practice.",
    isOnline: false,
    lastActiveAt: minutesAgo(25),
    mutualFriendCount: 6,
  }),
  meera: person("u7", "Meera Nair", "meera.nair", 26, {
    bio: "Cricket writer. Long-form only.",
    work: "Columnist at Cover Drive Weekly",
    isVerified: true,
    isOnline: true,
    location: "Kochi, India",
    friendCount: 1240,
    mutualFriendCount: 14,
  }),
  zoya: person("u8", "Zoya Ansari", "zoya.ansari", 44, {
    bio: "All-rounder. Mostly rounding up the team on WhatsApp.",
    isOnline: false,
    lastActiveAt: hoursAgo(4),
    mutualFriendCount: 21,
  }),
  dev: person("u9", "Dev Chauhan", "dev.chauhan", 51, {
    bio: "Groundsman's son. I judge you by your pitch report.",
    isOnline: false,
    lastActiveAt: daysAgo(1),
    mutualFriendCount: 3,
    location: "Nagpur, India",
  }),
  tara: person("u10", "Tara Menon", "tara.menon", 9, {
    bio: "Scorebook keeper, statistics hoarder.",
    isOnline: true,
    mutualFriendCount: 17,
  }),
  arjun: person("u11", "Arjun Pillai", "arjun.pillai", 68, {
    bio: "Number 11 with a number 3 attitude.",
    isOnline: false,
    lastActiveAt: daysAgo(3),
    isFriend: false,
    mutualFriendCount: 8,
  }),
  sana: person("u12", "Sana Qureshi", "sana.qureshi", 20, {
    bio: "Physio. Please stretch before you bowl.",
    isOnline: false,
    lastActiveAt: monthsAgo(1),
    isFriend: false,
    mutualFriendCount: 5,
    location: "Hyderabad, India",
  }),
} satisfies Record<string, User>;

/** The signed-in account. Everything "yours" hangs off this. */
export const currentUser: User = users.aarav;

/** Everyone except the current user. */
export const people: User[] = Object.values(users).filter(
  (u) => u.id !== currentUser.id,
);

export const userById = (id: ID): User | undefined =>
  Object.values(users).find((u) => u.id === id);

/** Narrows a User down to the shape posts, stories and reels carry. */
export const asAuthor = (user: User): Author => ({
  id: user.id,
  name: user.name,
  avatar: user.avatar,
  isVerified: user.isVerified,
  kind: "user",
});
