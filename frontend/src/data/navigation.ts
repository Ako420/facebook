/* ============================================================================
   Navigation config — header tabs, left sidebar, shortcuts, mobile tab bar.
   `icon` is a plain key: map it to whichever icon set you end up using.
   ========================================================================== */

import type { NavItem, Shortcut } from "./types";
import { currentUser } from "./users";
import { unreadMessageCount } from "./messages";
import { unreadNotificationCount } from "./notifications";

/** Centre tabs in the header. */
export const mainNav: NavItem[] = [
  { id: "home", label: "Home", icon: "home", href: "/" },
  { id: "watch", label: "Video", icon: "video", href: "/watch" },
  { id: "market", label: "Marketplace", icon: "store", href: "/marketplace" },
  { id: "groups", label: "Groups", icon: "users", href: "/groups" },
  { id: "gaming", label: "Gaming", icon: "gamepad", href: "/gaming" },
];

/** Right side of the header. */
export const headerActions: NavItem[] = [
  { id: "menu", label: "Menu", icon: "grid", href: "/menu" },
  {
    id: "messages",
    label: "Messenger",
    icon: "messenger",
    href: "/messages",
    badge: unreadMessageCount,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: "bell",
    href: "/notifications",
    badge: unreadNotificationCount,
  },
  { id: "account", label: "Account", icon: "chevron-down", href: "/account" },
];

/** Left column. The first row is the current user's profile. */
export const sidebarNav: NavItem[] = [
  {
    id: "profile",
    label: currentUser.name,
    icon: "avatar",
    href: `/profile/${currentUser.id}`,
  },
  { id: "friends", label: "Friends", icon: "users", href: "/friends" },
  { id: "market", label: "Marketplace", icon: "store", href: "/marketplace" },
  { id: "recent", label: "Most Recent", icon: "clock", href: "/recent" },
  { id: "groups", label: "Groups", icon: "users-group", href: "/groups" },
  { id: "watch", label: "Watch", icon: "video", href: "/watch" },
  { id: "reels", label: "Reels", icon: "film", href: "/reels" },
  { id: "saved", label: "Saved", icon: "bookmark", href: "/saved" },
  { id: "memories", label: "Memories", icon: "history", href: "/memories" },
  { id: "more", label: "See More", icon: "chevron-down", href: "#" },
];

/** Collapsed by default — everything after "See More". */
export const sidebarNavVisibleCount = 6;

export const shortcuts: Shortcut[] = [
  {
    id: "sc1",
    label: "Maidan Fanclub",
    initials: "MF",
    href: "/groups/g2",
  },
  {
    id: "sc2",
    label: "Test Championship",
    initials: "TC",
    href: "/groups/g3",
  },
  {
    id: "sc3",
    label: "Gear Exchange",
    initials: "GE",
    href: "/groups/g6",
  },
];

/** Mobile bottom bar — the same targets as the header. */
export const bottomNav: NavItem[] = [
  { id: "home", label: "Home", icon: "home", href: "/" },
  { id: "friends", label: "Friends", icon: "users", href: "/friends" },
  { id: "groups", label: "Groups", icon: "users-group", href: "/groups" },
  { id: "reels", label: "Reels", icon: "film", href: "/reels" },
  {
    id: "notifications",
    label: "Alerts",
    icon: "bell",
    href: "/notifications",
    badge: unreadNotificationCount,
  },
  { id: "menu", label: "Menu", icon: "menu", href: "/menu" },
];

export const footerLinks: string[] = [
  "Privacy",
  "Terms",
  "Advertising",
  "Cookies",
  "More",
];
