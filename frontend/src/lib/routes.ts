import { useNavigate } from "react-router-dom";

export const paths = {
  home: "/",
  reels: "/reels",
  friends: "/friends",
  groups: "/groups",
  messages: "/messages",
  chat: (id: string) => `/messages/${id}`,
  group: (id: string) => `/groups/${id}`,
  login: "/login",
  register: "/register",
  profile: (id: string) => `/profile/${id}`,
};


export function isRoutable(href: string): boolean {
  return (
    href === "/" ||
    href === "/reels" ||
    href === "/friends" ||
    href === "/login" ||
    href === "/register" ||
    href.startsWith("/profile") ||
    href.startsWith("/groups") ||
    href.startsWith("/messages")
  );
}


export function useGo() {
  const navigate = useNavigate();
  return (href: string) => {
    if (isRoutable(href)) navigate(href);
  };
}


export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (!isRoutable(href)) return false;
  if (href.startsWith("/profile")) return pathname.startsWith("/profile");
  if (href.startsWith("/groups")) return pathname.startsWith("/groups");
  if (href.startsWith("/messages")) return pathname.startsWith("/messages");
  return pathname === href || pathname.startsWith(`${href}/`);
}
