import { useEffect, useMemo, useState } from "react";
import { Icon } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { listFriends, toPerson } from "../../features/friends/friendApi";
import type { ApiPerson } from "../../features/friends/friendApi";
import { createGroupChat, startDirectChat } from "../../features/messages/messageApi";
import type { ApiConversation } from "../../features/messages/messageApi";
import { toApiFailure } from "../../lib/api";
import { cn } from "../../lib/cn";

/** The backend's rule: a group chat is you plus at least two others. */
const MIN_OTHERS = 2;

export type NewChatMode = "direct" | "group";

/**
 * One sheet for both kinds of chat. The mode is said out loud — a picker that
 * quietly became a group once you ticked a second name was a feature nobody
 * would ever find.
 */
export function NewChatModal({
  onClose,
  onStarted,
  initialMode = "direct",
}: {
  onClose: () => void;
  onStarted: (conversation: ApiConversation) => void;
  initialMode?: NewChatMode;
}) {
  const [mode, setMode] = useState<NewChatMode>(initialMode);
  const [friends, setFriends] = useState<ApiPerson[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const isGroup = mode === "group";

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
    const needle = query.trim().toLowerCase();
    return friends.filter(
      (person) => !needle || (person.name ?? "").toLowerCase().includes(needle),
    );
  }, [friends, query]);

  const chosen = useMemo(
    () => picked.map((id) => friends.find((person) => person.id === id)).filter(Boolean) as ApiPerson[],
    [picked, friends],
  );

  const switchMode = (next: NewChatMode) => {
    setMode(next);
    setError("");
    // A direct chat is one person, so trim the pick down rather than lose it.
    if (next === "direct") setPicked((current) => current.slice(0, 1));
  };

  const toggle = (id: string) => {
    setError("");
    setPicked((current) => {
      if (!isGroup) return current[0] === id ? [] : [id];
      return current.includes(id) ? current.filter((row) => row !== id) : [...current, id];
    });
  };

  const ready = isGroup ? picked.length >= MIN_OTHERS : picked.length === 1;

  const start = async () => {
    if (!ready || pending) return;

    setPending(true);
    setError("");

    try {
      const conversation = isGroup
        ? await createGroupChat(picked, name.trim() || undefined)
        : await startDirectChat(picked[0]);

      onStarted(conversation);
      onClose();
    } catch (caught) {
      setError(toApiFailure(caught).message);
    } finally {
      setPending(false);
    }
  };

  const buttonLabel = isGroup
    ? picked.length >= MIN_OTHERS
      ? `Create group chat (${picked.length + 1} people)`
      : `Pick at least ${MIN_OTHERS - picked.length} more`
    : picked.length === 1
      ? "Open chat"
      : "Pick someone to message";

  return (
    <div
      className="fixed inset-0 z-100 grid place-items-center bg-black/70 p-4"
      onClick={() => !pending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isGroup ? "New group chat" : "New message"}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-[30rem] flex-col overflow-hidden rounded-card bg-surface shadow-card"
      >
        <header className="relative border-b border-line px-gutter py-3">
          <h2 className="text-center text-lg font-bold text-ink">
            {isGroup ? "New group chat" : "New message"}
          </h2>
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

        <div className="flex gap-1 border-b border-line px-gutter py-2">
          {(
            [
              { id: "direct", label: "Message one person", icon: "messenger" },
              { id: "group", label: "Group chat", icon: "users-group" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={pending}
              aria-pressed={mode === option.id}
              onClick={() => switchMode(option.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-control py-1.5 text-sm font-semibold",
                mode === option.id
                  ? "bg-brand-soft text-brand"
                  : "text-ink-muted hover:bg-surface-hover",
              )}
            >
              <Icon name={option.icon} size={13} />
              {option.label}
            </button>
          ))}
        </div>

        {isGroup && (
          <div className="border-b border-line px-gutter py-2">
            <label className="block">
              <span className="sr-only">Group chat name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name the chat (optional)"
                maxLength={75}
                className="h-10 w-full rounded-control bg-surface-raised px-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:shadow-focus"
              />
            </label>

            {chosen.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 pt-2">
                {chosen.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => toggle(person.id)}
                      aria-label={`Remove ${person.name}`}
                      className="flex items-center gap-1.5 rounded-pill bg-brand-soft py-1 pr-2 pl-1 text-xs font-semibold text-brand hover:bg-brand/25"
                    >
                      <Avatar src={toPerson(person).avatar} alt="" size={20} />
                      {person.name}
                      <Icon name="close" size={9} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

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
                ? "Add some friends first — chats start with people you know."
                : "No friend by that name."}
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {available.map((person) => {
                const on = picked.includes(person.id);
                return (
                  <li key={person.id}>
                    <button
                      onClick={() => toggle(person.id)}
                      aria-pressed={on}
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
                      {/* A box for a group you build up, a circle for one person. */}
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center border",
                          isGroup ? "rounded-sm" : "rounded-pill",
                          on ? "border-brand bg-brand text-white" : "border-line",
                        )}
                      >
                        {on && <Icon name="check" size={10} />}
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

          <button
            type="button"
            onClick={start}
            disabled={!ready || pending}
            className={cn(
              "flex h-10 w-full items-center justify-center gap-2 rounded-control text-[0.95rem] font-semibold transition-colors",
              ready && !pending
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
            {pending ? "Starting…" : buttonLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
