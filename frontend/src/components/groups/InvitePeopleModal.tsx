import { useEffect, useMemo, useState } from "react";
import { Icon } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { listFriends, toPerson } from "../../features/friends/friendApi";
import type { ApiPerson } from "../../features/friends/friendApi";
import { inviteToGroup } from "../../features/groups/groupApi";
import type { InviteResult } from "../../features/groups/groupApi";
import { toApiFailure } from "../../lib/api";
import { cn } from "../../lib/cn";

/**
 * Invites go to your friends — the people you can actually name. Anyone
 * already in the group, or already invited, is left out of the list.
 */
export function InvitePeopleModal({
  groupId,
  groupName,
  isPrivate,
  excludeIds,
  onClose,
  onInvited,
}: {
  groupId: string;
  groupName: string;
  isPrivate: boolean;
  excludeIds: string[];
  onClose: () => void;
  onInvited: (result: InviteResult) => void;
}) {
  const [friends, setFriends] = useState<ApiPerson[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listFriends()
      .then((lists) => setFriends(lists.friends.map((edge) => edge.user)))
      .catch((caught) => setError(toApiFailure(caught).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  const available = useMemo(() => {
    const taken = new Set(excludeIds);
    const needle = query.trim().toLowerCase();

    return friends
      .filter((person) => !taken.has(person.id))
      .filter((person) => !needle || (person.name ?? "").toLowerCase().includes(needle));
  }, [friends, excludeIds, query]);

  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((row) => row !== id) : [...current, id],
    );

  const submit = async () => {
    if (picked.length === 0 || pending) return;

    setPending(true);
    setError("");

    try {
      const result = await inviteToGroup(groupId, picked);
      onInvited(result);
      onClose();
    } catch (caught) {
      setError(toApiFailure(caught).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 grid place-items-center bg-black/70 p-4"
      onClick={() => !pending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Invite people to ${groupName}`}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-[30rem] flex-col overflow-hidden rounded-card bg-surface shadow-card"
      >
        <header className="relative border-b border-line px-gutter py-3">
          <h2 className="text-center text-lg font-bold text-ink">Invite people</h2>
          <p className="truncate text-center text-xs text-ink-muted">{groupName}</p>
          <button
            type="button"
            aria-label="Close"
            disabled={pending}
            onClick={onClose}
            className="absolute top-2.5 right-3 grid size-9 place-items-center rounded-pill bg-surface-raised text-ink hover:bg-line disabled:opacity-50"
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="border-b border-line px-gutter py-2">
          <label className="relative block">
            <span className="sr-only">Search friends</span>
            <Icon
              name="search"
              size={13}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search friends"
              className="h-9 w-full rounded-pill bg-surface-raised pr-3 pl-8 text-sm text-ink outline-none placeholder:text-ink-faint focus:shadow-focus"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <p className="px-2 py-6 text-center text-sm text-ink-muted">Loading friends…</p>
          ) : available.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-ink-muted">
              {friends.length === 0
                ? "Add some friends first — invitations go to people you know."
                : query.trim()
                  ? "No friend by that name."
                  : "Everyone you know is already in this group or invited."}
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {available.map((person) => {
                const chosen = picked.includes(person.id);
                return (
                  <li key={person.id}>
                    <button
                      onClick={() => toggle(person.id)}
                      aria-pressed={chosen}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-hover"
                    >
                      <Avatar
                        src={toPerson(person).avatar}
                        alt={person.name ?? "Friend"}
                        size={40}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.95rem] font-semibold text-ink">
                          {person.name}
                        </span>
                        {person.work && (
                          <span className="block truncate text-xs text-ink-faint">
                            {person.work}
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-sm border",
                          chosen ? "border-brand bg-brand text-white" : "border-line",
                        )}
                      >
                        {chosen && <Icon name="check" size={11} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="border-t border-line px-gutter py-3">
          {error && (
            <p role="alert" className="mb-2 rounded-media bg-alert-soft px-3 py-2 text-sm text-ink">
              {error}
            </p>
          )}

          <p className="pb-2 text-xs text-ink-faint">
            {isPrivate
              ? "They will get an invitation. A private group cannot be joined without one, unless an admin approves a request."
              : "They will get an invitation to accept or turn down."}
          </p>

          <button
            type="button"
            onClick={submit}
            disabled={picked.length === 0 || pending}
            className={cn(
              "flex h-10 w-full items-center justify-center gap-2 rounded-control text-[0.95rem] font-semibold transition-colors",
              picked.length > 0 && !pending
                ? "bg-brand text-white hover:bg-brand-hover"
                : "cursor-not-allowed bg-surface-raised text-ink-faint",
            )}
          >
            {pending && (
              <span
                aria-hidden
                className="size-4 animate-spin rounded-pill border-2 border-current border-t-transparent"
              />
            )}
            {picked.length === 0
              ? "Select people to invite"
              : `Send ${picked.length} invitation${picked.length === 1 ? "" : "s"}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
