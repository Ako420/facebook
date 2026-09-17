import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { cn } from "../../lib/cn";
import { formatRelativeTime } from "../../lib/format";
import { useAuth } from "../../features/auth/AuthContext";
import { toPerson } from "../../features/friends/friendApi";
import {
  describeNotification,
  notificationHref,
} from "../../features/notifications/notificationApi";
import type {
  ApiNotification,
  NotificationKind,
} from "../../features/notifications/notificationApi";
import { useNotifications } from "../../features/notifications/NotificationsProvider";

type Filter = "all" | "unread";

const kindIcon: Record<NotificationKind, { icon: IconName; tone: string }> = {
  "friend-request": { icon: "user-plus", tone: "bg-brand" },
  "friend-accepted": { icon: "users", tone: "bg-brand" },
  comment: { icon: "message-solid", tone: "bg-accent" },
  reaction: { icon: "thumb-solid", tone: "bg-brand" },
  "group-invite": { icon: "users-group", tone: "bg-brand" },
};

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: ApiNotification;
  onOpen: () => void;
}) {
  const person = toPerson(notification.actor);
  const kind = kindIcon[notification.type];

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-hover"
    >
      <span className="relative shrink-0">
        <Avatar src={person.avatar} alt={person.name} size={56} />
        <span
          className={cn(
            "absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-pill text-white ring-2 ring-surface",
            kind.tone,
          )}
        >
          <Icon name={kind.icon} size={11} />
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "line-clamp-3 text-[0.9rem]",
            notification.isRead ? "text-ink-muted" : "text-ink",
          )}
        >
          <b className="font-semibold text-ink">{person.name}</b>{" "}
          {describeNotification(notification)}
        </span>
        <span
          className={cn(
            "block pt-0.5 text-xs",
            notification.isRead ? "text-ink-faint" : "font-semibold text-brand",
          )}
        >
          {formatRelativeTime(notification.createdAt)}
        </span>
      </span>

      {!notification.isRead && <span className="size-3 shrink-0 rounded-pill bg-brand" />}
    </button>
  );
}

export function NotificationList({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { user: account } = useAuth();
  const { notifications, unread, loading, error, hasMore, loadMore, markRead, markAllRead } =
    useNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  const rows =
    filter === "unread" ? notifications.filter((row) => !row.isRead) : notifications;

  const open = (notification: ApiNotification) => {
    markRead(notification.id);
    onNavigate?.();
    navigate(notificationHref(notification, account?.id ?? ""));
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-gutter pb-2">
        <div className="flex gap-2">
          {(["all", "unread"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={cn(
                "rounded-pill px-3 py-1 text-sm font-semibold capitalize",
                filter === option
                  ? "bg-brand-soft text-brand"
                  : "bg-surface-raised text-ink-muted hover:bg-line",
              )}
            >
              {option}
            </button>
          ))}
        </div>

        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="rounded-control px-2 py-1 text-sm font-medium text-brand hover:bg-surface-hover"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {loading && notifications.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-ink-muted">Loading notifications…</p>
        ) : error && notifications.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-ink-muted">{error}</p>
        ) : rows.length === 0 ? (
          <div className="grid place-items-center gap-2 px-2 py-10 text-center">
            <Icon name="bell-solid" size={26} className="text-ink-faint" />
            <p className="text-sm text-ink-muted">
              {filter === "unread" ? "You're all caught up." : "No notifications yet."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {rows.map((row) => (
              <li key={row.id}>
                <NotificationRow notification={row} onOpen={() => open(row)} />
              </li>
            ))}
          </ul>
        )}

        {hasMore && filter === "all" && (
          <button
            onClick={loadMore}
            className="mt-1 w-full rounded-lg py-2 text-center text-sm font-semibold text-ink hover:bg-surface-hover"
          >
            See previous notifications
          </button>
        )}
      </div>
    </>
  );
}

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();

  return (
    <div
      role="dialog"
      aria-label="Notifications"
      className="flex max-h-[min(36rem,80dvh)] w-88 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-card bg-surface shadow-card"
    >
      <header className="flex items-center justify-between gap-2 px-gutter pt-3 pb-2">
        <h2 className="text-2xl font-bold text-ink">Notifications</h2>
        <button
          onClick={() => {
            onClose();
            navigate("/notifications");
          }}
          aria-label="See all notifications"
          title="See all"
          className="grid size-9 place-items-center rounded-pill text-ink hover:bg-surface-hover"
        >
          <Icon name="chevron-right" size={15} />
        </button>
      </header>

      <NotificationList onNavigate={onClose} />
    </div>
  );
}
