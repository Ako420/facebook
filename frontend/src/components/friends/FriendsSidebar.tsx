import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { cn } from "../../lib/cn";

interface Item {
  id: string;
  label: string;
  icon: IconName;
  chevron?: boolean;
  badge?: number;
}

const items = (requestCount: number): Item[] => [
  { id: "home", label: "Home", icon: "users" },
  {
    id: "requests",
    label: "Friend requests",
    icon: "user-plus",
    chevron: true,
    badge: requestCount || undefined,
  },
  { id: "suggestions", label: "Suggestions", icon: "user-plus", chevron: true },
  { id: "all", label: "All friends", icon: "users", chevron: true },
  { id: "birthdays", label: "Birthdays", icon: "cake" },
];

export function FriendsSidebar({
  selected,
  onSelect,
  requestCount = 0,
}: {
  selected: string;
  onSelect: (id: string) => void;
  requestCount?: number;
}) {
  return (
    <aside className="sticky top-header hidden h-[calc(100dvh-var(--spacing-header))] w-sidebar shrink-0 overflow-y-auto bg-surface px-2 py-3 shadow-card md:block">
      <div className="flex items-center justify-between px-2 pb-2">
        <h1 className="text-2xl font-bold text-ink">Friends</h1>
        <button
          aria-label="Friends settings"
          className="grid size-icon place-items-center rounded-pill bg-surface-raised text-ink hover:bg-line"
        >
          <Icon name="settings" size={16} />
        </button>
      </div>

      <nav className="flex flex-col gap-0.5">
        {items(requestCount).map((item) => {
          const active = selected === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 py-2 text-left text-[0.95rem] font-medium",
                active ? "bg-brand-soft text-brand" : "hover:bg-surface-hover",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-pill",
                  active ? "bg-brand text-white" : "bg-surface-raised text-ink",
                )}
              >
                <Icon name={item.icon} size={17} />
              </span>
              <span className="truncate">{item.label}</span>
              {Boolean(item.badge) && (
                <span className="ml-auto rounded-pill bg-alert px-2 text-xs text-white">
                  {item.badge}
                </span>
              )}
              {item.chevron && !item.badge && (
                <Icon name="chevron-right" size={12} className="ml-auto text-ink-muted" />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
