import type { NavItem } from "./types";

/** Right side of the header. Badge numbers come from live state, not from here. */
export const headerActions: NavItem[] = [
  { id: "menu", label: "Menu", icon: "grid", href: "/menu" },
  { id: "messages", label: "Messenger", icon: "messenger", href: "/messages" },
  { id: "notifications", label: "Notifications", icon: "bell", href: "/notifications" },
  { id: "account", label: "Account", icon: "chevron-down", href: "/account" },
];

/** Left column. The first row is the signed-in person. */
export const sidebarNav: NavItem[] = [
  { id: "profile", label: "Profile", icon: "avatar", href: "/profile" },
  { id: "friends", label: "Friends", icon: "users", href: "/friends" },
  { id: "groups", label: "Groups", icon: "users-group", href: "/groups" },
  { id: "reels", label: "Reels", icon: "film", href: "/reels" },
  { id: "messages", label: "Messenger", icon: "messenger", href: "/messages" },
  { id: "notifications", label: "Notifications", icon: "bell", href: "/notifications" },
];

/** Mobile bottom bar — the same targets as the header. */
export const bottomNav: NavItem[] = [
  { id: "home", label: "Home", icon: "home", href: "/" },
  { id: "friends", label: "Friends", icon: "users", href: "/friends" },
  { id: "groups", label: "Groups", icon: "users-group", href: "/groups" },
  { id: "reels", label: "Reels", icon: "film", href: "/reels" },
  { id: "notifications", label: "Alerts", icon: "bell", href: "/notifications" },
  { id: "menu", label: "Menu", icon: "menu", href: "/menu" },
];

export const footerLinks: string[] = ["Privacy", "Terms", "Cookies", "More"];
