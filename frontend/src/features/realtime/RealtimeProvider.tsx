import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { readToken } from "../../lib/api";
import { createRealtimeClient } from "../../lib/realtime";
import type { RealtimeStatus } from "../../lib/realtime";
import type { ApiMessage } from "../messages/messageApi";
import type { ApiNotification } from "../notifications/notificationApi";

export interface RealtimeEvents {
  ready: { userId: string };
  "message:new": { conversationId: string; message: ApiMessage };
  "message:updated": { conversationId: string; message: ApiMessage };
  "message:hidden": { conversationId: string; messageId: string };
  "conversation:read": { conversationId: string };
  "conversation:updated": { conversationId: string };
  "conversation:removed": { conversationId: string };
  "notification:new": { notification: ApiNotification; unread: number };
  "notification:read": { ids: string[] | "all"; unread: number };
  "notification:removed": { ids: string[]; unread: number };
  "friends:changed": Record<string, never>;
}

interface RealtimeValue {
  status: RealtimeStatus;
  subscribe: (type: string, listener: (data: unknown) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => createRealtimeClient(readToken), []);
  const [status, setStatus] = useState<RealtimeStatus>("closed");

  useEffect(() => {
    const offStatus = client.onStatus(setStatus);
    const timer = setTimeout(() => client.start(), 0);

    return () => {
      clearTimeout(timer);
      offStatus();
      client.stop();
    };
  }, [client]);

  const value = useMemo(() => ({ status, subscribe: client.on }), [status, client]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

const useRealtime = () => {
  const value = useContext(RealtimeContext);
  if (!value) throw new Error("useRealtime must be used inside <RealtimeProvider>.");
  return value;
};

export const useRealtimeStatus = () => useRealtime().status;

export function useRealtimeEvent<K extends keyof RealtimeEvents>(
  type: K,
  handler: (data: RealtimeEvents[K]) => void,
) {
  const { subscribe } = useRealtime();
  const latest = useRef(handler);

  useEffect(() => {
    latest.current = handler;
  });

  useEffect(
    () => subscribe(type, (data) => latest.current(data as RealtimeEvents[K])),
    [subscribe, type],
  );
}
