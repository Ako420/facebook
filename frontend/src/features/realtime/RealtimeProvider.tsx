import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { readToken } from "../../lib/api";
import { createRealtimeClient } from "../../lib/realtime";
import type { RealtimeClient, RealtimeStatus } from "../../lib/realtime";
import type { ApiMessage } from "../messages/messageApi";
import type { ApiNotification } from "../notifications/notificationApi";
import type { ApiComment } from "../posts/engagementApi";

export interface RealtimeEvents {
  ready: { userId: string; resync: boolean };
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
  "presence:changed": { userId: string; online: boolean; lastActiveAt: string };
  typing: { conversationId: string; userId: string; name: string };
  "comment:new": { postId: string; comment: ApiComment };
  "comment:deleted": { postId: string; commentId: string };
  "post:reactions": { postId: string; counts: Record<string, number>; total: number };
}

interface RealtimeValue {
  status: RealtimeStatus;
  client: RealtimeClient;
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

  const value = useMemo(() => ({ status, client }), [status, client]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

const useRealtime = () => {
  const value = useContext(RealtimeContext);
  if (!value) throw new Error("useRealtime must be used inside <RealtimeProvider>.");
  return value;
};

export const useRealtimeStatus = () => useRealtime().status;

export const useRealtimeSend = () => useRealtime().client.send;

export function useRealtimeEvent<K extends keyof RealtimeEvents>(
  type: K,
  handler: (data: RealtimeEvents[K]) => void,
) {
  const { client } = useRealtime();
  const latest = useRef(handler);

  useEffect(() => {
    latest.current = handler;
  });

  useEffect(
    () => client.on(type, (data) => latest.current(data as RealtimeEvents[K])),
    [client, type],
  );
}

export function useRealtimeTopic(topic: string | null) {
  const { client } = useRealtime();

  useEffect(() => {
    if (!topic) return;
    return client.subscribe(topic);
  }, [client, topic]);
}
