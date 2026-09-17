import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toApiFailure } from "../../lib/api";
import { useRealtimeEvent, useRealtimeStatus } from "../realtime/RealtimeProvider";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notificationApi";
import type { ApiNotification } from "./notificationApi";

const FALLBACK_POLL_MS = 60_000;

interface NotificationsValue {
  notifications: ApiNotification[];
  unread: number;
  loading: boolean;
  error: string;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const live = useRealtimeStatus() === "open";

  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const page = await listNotifications();
      setNotifications(page.notifications);
      setCursor(page.nextCursor);
      setUnread(page.unread);
      setError("");
    } catch (caught) {
      setError(toApiFailure(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor) return;

    try {
      const page = await listNotifications({ before: cursor });
      setNotifications((current) => {
        const known = new Set(current.map((row) => row.id));
        return [...current, ...page.notifications.filter((row) => !known.has(row.id))];
      });
      setCursor(page.nextCursor);
      setUnread(page.unread);
    } catch (caught) {
      setError(toApiFailure(caught).message);
    }
  }, [cursor]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (live) return;
    const timer = setInterval(refresh, FALLBACK_POLL_MS);
    return () => clearInterval(timer);
  }, [live, refresh]);

  useRealtimeEvent("ready", () => {
    refresh();
  });

  useRealtimeEvent("notification:new", ({ notification, unread: count }) => {
    setNotifications((current) =>
      current.some((row) => row.id === notification.id) ? current : [notification, ...current],
    );
    setUnread(count);
  });

  useRealtimeEvent("notification:read", ({ ids, unread: count }) => {
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((row) =>
        ids === "all" || ids.includes(row.id)
          ? { ...row, isRead: true, readAt: row.readAt ?? now }
          : row,
      ),
    );
    setUnread(count);
  });

  useRealtimeEvent("notification:removed", ({ ids, unread: count }) => {
    setNotifications((current) => current.filter((row) => !ids.includes(row.id)));
    setUnread(count);
  });

  const markRead = useCallback(
    (id: string) => {
      const row = notifications.find((item) => item.id === id);
      if (!row || row.isRead) return;

      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item,
        ),
      );
      setUnread((count) => Math.max(0, count - 1));

      markNotificationRead(id)
        .then(setUnread)
        .catch(() => refresh());
    },
    [notifications, refresh],
  );

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => (item.isRead ? item : { ...item, isRead: true, readAt: now })),
    );
    setUnread(0);

    markAllNotificationsRead()
      .then(setUnread)
      .catch(() => refresh());
  }, [refresh]);

  const value = useMemo<NotificationsValue>(
    () => ({
      notifications,
      unread,
      loading,
      error,
      hasMore: Boolean(cursor),
      refresh,
      loadMore,
      markRead,
      markAllRead,
    }),
    [notifications, unread, loading, error, cursor, refresh, loadMore, markRead, markAllRead],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error("useNotifications must be used inside <NotificationsProvider>.");
  return value;
}
