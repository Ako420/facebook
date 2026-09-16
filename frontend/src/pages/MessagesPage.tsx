import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ConversationRow } from "../components/messages/ChatsPanel";
import { MessageThread } from "../components/messages/MessageThread";
import { NewChatModal } from "../components/messages/NewChatModal";
import type { NewChatMode } from "../components/messages/NewChatModal";
import { Icon } from "../components/icons/Icon";
import { cn } from "../lib/cn";
import { useMessages } from "../features/messages/MessagesProvider";


function Inbox({
  activeId,
  onOpen,
  onCompose,
}: {
  activeId?: string;
  onOpen: (id: string) => void;
  onCompose: (mode: NewChatMode) => void;
}) {
  const { conversations, loading, error, unread, alerts } = useMessages();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return conversations.filter(
      (row) =>
        !needle ||
        row.title.toLowerCase().includes(needle) ||
        (row.lastMessage?.preview ?? "").toLowerCase().includes(needle),
    );
  }, [conversations, query]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex items-center justify-between gap-2 px-gutter pt-3">
        <h1 className="text-2xl font-bold text-ink">
          Chats
          {unread > 0 && (
            <span className="ml-2 rounded-pill bg-alert px-2 text-sm text-white">{unread}</span>
          )}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => onCompose("group")}
            aria-label="New group chat"
            title="New group chat"
            className="grid size-9 place-items-center rounded-pill bg-surface-raised text-ink hover:bg-line"
          >
            <Icon name="users-group" size={15} />
          </button>
          <button
            onClick={() => onCompose("direct")}
            aria-label="New message"
            title="New message"
            className="grid size-9 place-items-center rounded-pill bg-surface-raised text-ink hover:bg-line"
          >
            <Icon name="edit" size={15} />
          </button>
        </div>
      </header>

      <div className="px-gutter py-2">
        <label className="relative block">
          <span className="sr-only">Search Messenger</span>
          <Icon
            name="search"
            size={13}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Messenger"
            className="h-9 w-full rounded-pill bg-surface-raised pr-3 pl-8 text-sm text-ink outline-none placeholder:text-ink-faint focus:shadow-focus"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {loading && conversations.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-ink-muted">Loading chats…</p>
        ) : error && conversations.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-ink-muted">{error}</p>
        ) : rows.length === 0 ? (
          <div className="grid place-items-center gap-2 px-2 py-10 text-center">
            <Icon name="messenger" size={26} className="text-ink-faint" />
            <p className="text-sm text-ink-muted">
              {conversations.length === 0
                ? "No chats yet. Start one with a friend."
                : "No chat matches that search."}
            </p>
            {conversations.length === 0 && (
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => onCompose("direct")}
                  className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                >
                  New message
                </button>
                <button
                  onClick={() => onCompose("group")}
                  className="rounded-control bg-surface-raised px-4 py-2 text-sm font-semibold text-ink hover:bg-line"
                >
                  New group chat
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {rows.map((row) => (
              <li key={row.id}>
                <ConversationRow
                  conversation={row}
                  active={row.id === activeId}
                  onOpen={() => onOpen(row.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      
      {alerts.supported && (
        <footer className="border-t border-line px-gutter py-2">
          {alerts.permission === "granted" ? (
            <button
              onClick={alerts.toggle}
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-sm text-ink hover:bg-surface-hover"
            >
              <Icon
                name={alerts.enabled ? "bell-solid" : "bell"}
                size={14}
                className={alerts.enabled ? "text-brand" : "text-ink-faint"}
              />
              <span className="flex-1">Desktop alerts</span>
              <span
                className={cn(
                  "flex h-5 w-9 items-center rounded-pill p-0.5 transition-colors",
                  alerts.enabled ? "bg-brand" : "bg-line",
                )}
              >
                <span
                  className={cn(
                    "size-4 rounded-pill bg-white transition-transform",
                    alerts.enabled && "translate-x-4",
                  )}
                />
              </span>
            </button>
          ) : alerts.permission === "denied" ? (
            <p className="px-1 py-1 text-xs text-ink-faint">
              Desktop alerts are blocked for this site. Allow notifications in your
              browser settings to turn them back on.
            </p>
          ) : (
            <button
              onClick={alerts.request}
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-sm font-semibold text-brand hover:bg-surface-hover"
            >
              <Icon name="bell-solid" size={14} />
              Turn on desktop alerts
            </button>
          )}
        </footer>
      )}
    </div>
  );
}

export default function MessagesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [composing, setComposing] = useState<NewChatMode | null>(null);

  return (
    <div className="mx-auto h-[calc(100dvh-var(--spacing-header)-3.5rem)] w-full max-w-shell lg:h-[calc(100dvh-var(--spacing-header))]">
      <div className="flex h-full min-h-0">
        <aside
          className={cn(
            "w-full shrink-0 border-r border-line lg:block lg:w-88 ",
            id && "hidden",
          )}
        >
          <Inbox
            activeId={id}
            onOpen={(next) => navigate(`/messages/${next}`)}
            onCompose={(mode) => setComposing(mode)}
          />
        </aside>

        <main className={cn("min-w-0 flex-1 bg-surface", !id && "hidden lg:block")}>
          {id ? (
            <MessageThread key={id} conversationId={id} />
          ) : (
            <div className="grid h-full place-items-center px-gutter text-center">
              <div className="grid justify-items-center gap-2">
                <Icon name="messenger" size={40} className="text-ink-faint" />
                <p className="text-[0.95rem] font-semibold text-ink">Your messages</p>
                <p className="max-w-prose text-sm text-ink-muted">
                  Pick a chat on the left, or start a new one.
                </p>
                <div className="mt-1 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => setComposing("direct")}
                    className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                  >
                    New message
                  </button>
                  <button
                    onClick={() => setComposing("group")}
                    className="rounded-control bg-surface-raised px-4 py-2 text-sm font-semibold text-ink hover:bg-line"
                  >
                    New group chat
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {composing && (
        <NewChatModal
          initialMode={composing}
          onClose={() => setComposing(null)}
          onStarted={(conversation) => navigate(`/messages/${conversation.id}`)}
        />
      )}
    </div>
  );
}
