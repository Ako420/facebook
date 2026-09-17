import { bottomNav } from "../../data";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { cn } from "../../lib/cn";
import { useLocation } from "react-router-dom";
import { isActivePath, useGo } from "../../lib/routes";
import { useNotifications } from "../../features/notifications/NotificationsProvider";

const iconFor: Record<string, IconName> = {
  home: "home",
  users: "users",
  "users-group": "users-group",
  film: "reels",
  bell: "bell-solid",
  menu: "menu",
};

export function BottomNav() {
  const { pathname } = useLocation();
  const go = useGo();
  const { unread } = useNotifications();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-stretch border-t border-line bg-surface lg:hidden">
      {bottomNav.map((item) => {
        const active = isActivePath(pathname, item.href);
        const badge = item.id === "notifications" ? unread : item.badge;
        return (
          <button
            key={item.id}
            onClick={() => go(item.href)}
            aria-label={item.label}
            className={cn(
              "relative flex flex-1 items-center justify-center",
              active ? "text-brand" : "text-ink-muted",
            )}
          >
            <Icon name={iconFor[item.icon] ?? "home"} size={22} />
            {Boolean(badge) && (
              <span className="absolute top-2 right-1/4 min-w-4 rounded-pill bg-alert px-1 text-[0.6rem] text-white">
                {badge}
              </span>
            )}
            {active && <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-t-sm bg-brand" />}
          </button>
        );
      })}
    </nav>
  );
}
