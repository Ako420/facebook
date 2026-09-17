import { api } from "./api";

export type RealtimeStatus = "connecting" | "open" | "closed";

type Listener = (data: unknown) => void;

const FINAL_CLOSE_CODES = new Set([4001, 4003]);

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const REMEMBERED_EVENT_IDS = 500;

export const realtimeUrl = () => {
  const url = new URL(api.defaults.baseURL ?? "http://localhost:3000/api");
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  return url.toString();
};

export const compareEventIds = (a: string, b: string) => {
  const [aTime, aSeq] = a.split("-").map(Number);
  const [bTime, bSeq] = b.split("-").map(Number);
  return aTime - bTime || aSeq - bSeq;
};

export interface RealtimeClient {
  start: () => void;
  stop: () => void;
  on: (type: string, listener: Listener) => () => void;
  onStatus: (listener: (status: RealtimeStatus) => void) => () => void;
  send: (message: { type: string } & Record<string, unknown>) => void;
  subscribe: (topic: string) => () => void;
}

export function createRealtimeClient(getToken: () => string | null): RealtimeClient {
  let socket: WebSocket | null = null;
  let status: RealtimeStatus = "closed";
  let running = false;
  let halted = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let lastEventId: string | null = null;

  const seenEventIds = new Set<string>();
  const topics = new Map<string, number>();
  const listeners = new Map<string, Set<Listener>>();
  const statusListeners = new Set<(status: RealtimeStatus) => void>();

  const setStatus = (next: RealtimeStatus) => {
    if (next === status) return;
    status = next;
    statusListeners.forEach((listener) => listener(next));
  };

  const dispatch = (type: string, data: unknown) => {
    listeners.get(type)?.forEach((listener) => listener(data));
  };

  const send = (message: object) => {
    if (status === "open" && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  const isDuplicate = (id: string) => {
    if (seenEventIds.has(id)) return true;

    seenEventIds.add(id);
    if (seenEventIds.size > REMEMBERED_EVENT_IDS) {
      seenEventIds.delete(seenEventIds.values().next().value as string);
    }
    if (!lastEventId || compareEventIds(id, lastEventId) > 0) lastEventId = id;

    return false;
  };

  const cancelRetry = () => {
    clearTimeout(retryTimer);
    retryTimer = undefined;
  };

  const scheduleRetry = () => {
    if (!running || halted || retryTimer) return;

    const ceiling = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
    const delay = ceiling / 2 + Math.random() * (ceiling / 2);
    attempt += 1;

    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      connect();
    }, delay);
  };

  const connect = () => {
    if (!running || halted || socket) return;

    const token = getToken();
    if (!token) {
      setStatus("closed");
      return;
    }

    setStatus("connecting");
    const ws = new WebSocket(realtimeUrl());
    socket = ws;

    ws.onopen = () => ws.send(JSON.stringify({ type: "auth", token, lastEventId }));

    ws.onmessage = (event) => {
      let frame: { type?: unknown; id?: unknown; data?: unknown };
      try {
        frame = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (typeof frame?.type !== "string") return;
      if (typeof frame.id === "string" && isDuplicate(frame.id)) return;

      if (frame.type === "ready") {
        attempt = 0;
        setStatus("open");
        topics.forEach((_, topic) => send({ type: "subscribe", topic }));
      }

      dispatch(frame.type, frame.data);
    };

    ws.onclose = (event) => {
      if (socket !== ws) return;

      socket = null;
      setStatus("closed");

      if (FINAL_CLOSE_CODES.has(event.code)) {
        halted = true;
        return;
      }

      scheduleRetry();
    };
  };

  const reconnectNow = () => {
    if (!running || halted || socket) return;
    cancelRetry();
    connect();
  };

  const onOnline = () => reconnectNow();
  const onVisible = () => {
    if (document.visibilityState === "visible") reconnectNow();
  };

  return {
    start() {
      if (running) return;
      running = true;
      halted = false;
      attempt = 0;

      window.addEventListener("online", onOnline);
      document.addEventListener("visibilitychange", onVisible);
      connect();
    },

    stop() {
      running = false;
      cancelRetry();

      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);

      const ws = socket;
      socket = null;
      ws?.close(1000, "Signed out");
      setStatus("closed");
    },

    on(type, listener) {
      const set = listeners.get(type) ?? new Set<Listener>();
      listeners.set(type, set);
      set.add(listener);

      return () => {
        set.delete(listener);
      };
    },

    onStatus(listener) {
      statusListeners.add(listener);
      return () => {
        statusListeners.delete(listener);
      };
    },

    send,

    subscribe(topic) {
      const count = topics.get(topic) ?? 0;
      topics.set(topic, count + 1);
      if (count === 0) send({ type: "subscribe", topic });

      let active = true;
      return () => {
        if (!active) return;
        active = false;

        const remaining = (topics.get(topic) ?? 1) - 1;
        if (remaining > 0) {
          topics.set(topic, remaining);
          return;
        }

        topics.delete(topic);
        send({ type: "unsubscribe", topic });
      };
    },
  };
}
