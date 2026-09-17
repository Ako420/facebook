import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { listFriends } from "../friends/friendApi";
import { useRealtimeEvent } from "../realtime/RealtimeProvider";

export interface Presence {
  online: boolean;
  lastActiveAt: string | null;
}

const PresenceContext = createContext<Map<string, Presence>>(new Map());

export function PresenceProvider({ children }: { children: ReactNode }) {
  const [presence, setPresence] = useState<Map<string, Presence>>(new Map());

  const load = useCallback(async () => {
    try {
      const { friends } = await listFriends();
      setPresence(
        new Map(
          friends.map((edge) => [
            edge.user.id,
            { online: Boolean(edge.user.online), lastActiveAt: edge.user.lastActiveAt ?? null },
          ]),
        ),
      );
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeEvent("ready", () => {
    load();
  });

  useRealtimeEvent("friends:changed", () => {
    load();
  });

  useRealtimeEvent("presence:changed", ({ userId, online, lastActiveAt }) => {
    setPresence((current) => new Map(current).set(userId, { online, lastActiveAt }));
  });

  return <PresenceContext.Provider value={presence}>{children}</PresenceContext.Provider>;
}

export const usePresenceMap = () => useContext(PresenceContext);

export const usePresence = (userId?: string | null) => {
  const presence = useContext(PresenceContext);
  return userId ? presence.get(userId) : undefined;
};
