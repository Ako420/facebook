import { useState } from "react";
import {
  currentUser,
  footerLinks,
  shortcuts,
  sidebarNav,
  sidebarNavVisibleCount,
} from "../../data";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { cn } from "../../lib/cn";
import { useLocation } from "react-router-dom";
import { isActivePath, useGo } from "../../lib/routes";
import { useAuth } from "../../features/auth/AuthContext";

const iconFor: Record<string, IconName> = {
  users: "users",
  store: "store",
  clock: "clock",
  "users-group": "users-group",
  video: "watch",
  film: "reels",
  bookmark: "bookmark",
  history: "history",
  "chevron-down": "chevron-down",
};

const colorFor: Record<string, string> = {
  friends: "text-[#1b74e4]",
  market: "text-[#2abba7]",
  recent: "text-[#f7b125]",
  groups: "text-[#1b74e4]",
  watch: "text-[#f3425f]",
  reels: "text-[#e0447c]",
  saved: "text-[#a033ff]",
  memories: "text-[#1b74e4]",
};

export function LeftSidebar() {
  const { pathname } = useLocation();
  const go = useGo();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const items = expanded
    ? sidebarNav.filter((item) => item.id !== "more")
    : sidebarNav.slice(0, sidebarNavVisibleCount);

  return (
    <aside className="sticky top-header hidden h-[calc(100dvh-var(--spacing-header))] w-sidebar shrink-0 overflow-y-auto px-2 py-3 xl:block">
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <button
              key={item.id}
              onClick={() => go(item.id === "profile" && user ? `/profile/${user.id}` : item.href)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 py-2 text-left text-[0.95rem] font-medium",
                active ? "bg-brand-soft text-brand" : "hover:bg-surface-hover",
              )}
            >
              {item.icon === "avatar" ? (
                <Avatar src={user?.avatarUrl || currentUser.avatar} alt={item.label} size={36} />
              ) : (
                <span className="grid size-9 place-items-center">
                  <Icon
                    name={iconFor[item.icon] ?? "list"}
                    size={22}
                    className={active ? "text-brand" : colorFor[item.id]}
                  />
                </span>
              )}
              <span className="truncate">
                {item.id === "profile" && user ? user.name : item.label}
              </span>
              {Boolean(item.badge) && (
                <span className="ml-auto rounded-pill bg-alert px-2 text-xs text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-3 rounded-lg px-2 py-2 text-left text-[0.95rem] font-medium hover:bg-surface-hover"
          >
            <span className="grid size-9 place-items-center rounded-pill bg-surface-raised">
              <Icon name="chevron-down" size={14} />
            </span>
            See more
          </button>
        )}
      </nav>

      <hr className="my-3 border-line" />

      <h2 className="px-2 pb-1 text-base font-semibold text-ink-muted">Your shortcuts</h2>
      <nav className="flex flex-col gap-0.5">
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.id}
            className="flex items-center gap-3 rounded-lg px-2 py-2 text-left text-[0.95rem] font-medium hover:bg-surface-hover"
          >
            <span className="grid size-9 place-items-center rounded-media bg-gradient-to-br from-brand to-[#7b2ff7] text-sm font-semibold text-white">
              {shortcut.initials}
            </span>
            <span className="truncate">{shortcut.label}</span>
          </button>
        ))}
      </nav>

      <footer className="px-2 pt-4 text-xs text-ink-faint">
        <p className="leading-relaxed">
          {footerLinks.map((link, index) => (
            <span key={link}>
              <button className="hover:underline">{link}</button>
              {index < footerLinks.length - 1 && <span> · </span>}
            </span>
          ))}
        </p>
        <p className="pt-2">Meta © {new Date().getFullYear()}</p>
      </footer>
    </aside>
  );
}
