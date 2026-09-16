import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { listConversations, totalUnread } from "./messageApi";
import type { ApiConversation } from "./messageApi";
import { useAuth } from "../auth/AuthContext";


const POLL_MS = 15_000;

const ALERTS_KEY = "fb.messageAlerts";

const readPreference = () => {
  try {
    return window.localStorage.getItem(ALERTS_KEY) !== "off";
  } catch {
    return true;
  }
};

const writePreference = (on: boolean) => {
  try {
    window.localStorage.setItem(ALERTS_KEY, on ? "on" : "off");
  } catch {
    /* Storage can be blocked; the preference is a convenience, not state. */

  }
};

const supported = typeof window !== "undefined" && "Notification" in window;

interface MessagesValue {
  conversations: ApiConversation[];
  unread: number;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  clearUnread: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  alerts: {
    supported: boolean;
    permission: NotificationPermission;
    enabled: boolean;
    request: () => Promise<void>;
    toggle: () => void;
  };
}

const MessagesContext = createContext<MessagesValue | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { status } = useAuth();
  const signedIn = status === "authenticated";

  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : "denied",
  );
  const [wanted, setWanted] = useState(readPreference);

  // The last message id seen per chat, so a poll can tell what is new.
  const seen = useRef(new Map<string, string>());
  const primed = useRef(false);
  const activeId = useRef<string | null>(null);

  const enabled = supported && permission === "granted" && wanted;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  /** One desktop alert per new message, tagged so a chat replaces its own. */
  const alert = useCallback(
    (conversation: ApiConversation) => {
      if (!enabledRef.current) return;

      const body = conversation.lastMessage?.preview || "Sent you a message";
      const notification = new Notification(conversation.title, {
        body,
        tag: conversation.id,
        icon: conversation.avatarUrl ?? undefined,
      });

      notification.onclick = () => {
        window.focus();
        navigate(`/messages/${conversation.id}`);
        notification.close();
      };
    },
    [navigate],
  );

  const refresh = useCallback(async () => {
    try {
      const rows = await listConversations();
      setConversations(rows);
      setError("");

      const hidden = document.visibilityState === "hidden";

      for (const row of rows) {
        const last = row.lastMessage;
        if (!last) continue;

        const previous = seen.current.get(row.id);
        seen.current.set(row.id, last.id);

        if (!primed.current || previous === last.id) continue;
        if (last.fromViewer) continue;

        // A thread you are looking at is already telling you.
        if (!hidden && activeId.current === row.id) continue;

        alert(row);
      }

      primed.current = true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reach messages.");
    } finally {
      setLoading(false);
    }
  }, [alert]);

  useEffect(() => {
    if (!signedIn) {
      setConversations([]);
      setLoading(false);
      seen.current.clear();
      primed.current = false;
      return;
    }

    refresh();
    const timer = setInterval(refresh, POLL_MS);

    // Coming back to the tab should not wait out the rest of the interval.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [signedIn, refresh]);

  const clearUnread = useCallback((id: string) => {
    setConversations((current) =>
      current.map((row) => (row.id === id ? { ...row, unreadCount: 0 } : row)),
    );
  }, []);

  const setActiveConversation = useCallback((id: string | null) => {
    activeId.current = id;
  }, []);

  /** Browsers only hand out permission from a real click, so this is a button. */
  const request = useCallback(async () => {
    if (!supported) return;

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      setWanted(true);
      writePreference(true);
    }
  }, []);

  const toggle = useCallback(() => {
    setWanted((current) => {
      writePreference(!current);
      return !current;
    });
  }, []);

  const value = useMemo<MessagesValue>(
    () => ({
      conversations,
      unread: totalUnread(conversations),
      loading,
      error,
      refresh,
      clearUnread,
      setActiveConversation,
      alerts: { supported, permission, enabled, request, toggle },
    }),
    [
      conversations,
      loading,
      error,
      refresh,
      clearUnread,
      setActiveConversation,
      permission,
      enabled,
      request,
      toggle,
    ],
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const value = useContext(MessagesContext);
  if (!value) throw new Error("useMessages must be used inside <MessagesProvider>.");
  return value;
}
