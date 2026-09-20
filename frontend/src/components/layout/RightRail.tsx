import { isBirthdayToday, listFriends, toPerson } from "../../features/friends/friendApi";
import type { FriendEdge } from "../../features/friends/friendApi";
import { Icon } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePresenceMap } from "../../features/presence/PresenceProvider";
import { useRealtimeEvent } from "../../features/realtime/RealtimeProvider";

export function RightRail() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<FriendEdge[]>([]);
  const presence = usePresenceMap();

  const loadContacts = useCallback(() => {
    listFriends()
      .then((lists) => setContacts(lists.friends))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useRealtimeEvent("friends:changed", loadContacts);

  const birthdays = contacts.filter((edge) => isBirthdayToday(edge.user.birthday));

  const sortedContacts = [...contacts].sort(
    (a, b) =>
      Number(Boolean(presence.get(b.user.id)?.online)) -
      Number(Boolean(presence.get(a.user.id)?.online)),
  );

  return (
    <aside className="sticky top-header hidden h-[calc(100dvh-var(--spacing-header))] w-rail shrink-0 overflow-y-auto px-2 py-4 lg:block">
      {birthdays.length > 0 && (
        <>
          <h2 className="px-2 pb-1 text-base font-semibold text-ink-muted">Birthdays</h2>
          <button
            onClick={() => navigate(`/profile/${birthdays[0].user.id}`)}
            className="flex w-full items-start gap-3 rounded-lg p-2 text-left hover:bg-surface-hover"
          >
            <Icon name="gift" size={30} className="text-[#f3425f]" />
            <p className="text-sm text-ink">
              <b className="font-semibold">{toPerson(birthdays[0].user).name}</b>
              {birthdays.length > 1 && (
                <>
                  {" and "}
                  <b className="font-semibold">{birthdays.length - 1} others</b>
                </>
              )}
              {birthdays.length > 1 ? " have birthdays today." : " has a birthday today."}
            </p>
          </button>

          <hr className="my-3 border-line" />
        </>
      )}

      <div className="flex items-center justify-between px-2 pb-1">
        <h2 className="text-base font-semibold text-ink-muted">Contacts</h2>
        <div className="flex items-center gap-1 text-ink-muted">
          <button className="grid size-8 place-items-center rounded-pill hover:bg-surface-hover">
            <Icon name="video-camera" size={16} />
          </button>
          <button className="grid size-8 place-items-center rounded-pill hover:bg-surface-hover">
            <Icon name="search" size={16} />
          </button>
          <button className="grid size-8 place-items-center rounded-pill hover:bg-surface-hover">
            <Icon name="dots" size={16} />
          </button>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {contacts.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-ink-muted">No contacts yet.</p>
        )}
        {sortedContacts.map((edge) => {
          const person = toPerson(edge.user);
          return (
            <button
              key={person.id}
              onClick={() => navigate(`/profile/${person.id}`)}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface-hover"
            >
              <Avatar
                src={person.avatar}
                alt={person.name}
                size={32}
                online={Boolean(presence.get(person.id)?.online)}
              />
              <span className="truncate text-[0.95rem] font-medium">{person.name}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
