import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { formatRelativeTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import { photo } from "../../data";
import { previewOf } from "../../features/messages/messageApi";
import type { ApiConversation } from "../../features/messages/messageApi";
import { useMessages } from "../../features/messages/MessagesProvider";

type Filter = "all" | "unread" | "groups";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "groups", label: "Groups" },
];


export const chatAvatar = (conversation: ApiConversation) =>
  conversation.avatarUrl || photo(`chat-${conversation.id}`, 96, 96);

export function ConversationRow({
  conversation,
  onOpen,
  active = false,
}: {
  conversation: ApiConversation;
  onOpen: () => void;
  active?: boolean;
}) {
  const unread = conversation.unreadCount > 0;

  return (
    <button
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg p-2 text-left",
        active ? "bg-brand-soft" : "hover:bg-surface-hover",
      )}
    >
      <Avatar src={chatAvatar(conversation)} alt={conversation.title} size={48} />

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[0.95rem]",
            unread ? "font-bold text-ink" : "font-semibold text-ink",
          )}
        >
          {conversation.title}
        </span>
        <span
          className={cn(
            "block truncate text-xs",
            unread ? "font-semibold text-ink" : "text-ink-muted",
          )}
        >
          {previewOf(conversation)}
          {conversation.lastMessage && (
            <> · {formatRelativeTime(conversation.lastMessage.sentAt)}</>
          )}
        </span>
      </span>

      {unread && <span className="size-3 shrink-0 rounded-pill bg-brand" />}
    </button>
  );
}


export function ChatsPanel({
  onClose,
  onCompose,
}: {
  onClose: () => void;
  onCompose: () => void;
}) {
  const navigate = useNavigate();
  const { conversations, loading, error, alerts } = useMessages();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return conversations
      .filter((row) => (filter === "unread" ? row.unreadCount > 0 : true))
      .filter((row) => (filter === "groups" ? row.type === "group" : true))
      .filter(
        (row) =>
          !needle ||
          row.title.toLowerCase().includes(needle) ||
          (row.lastMessage?.preview ?? "").toLowerCase().includes(needle),
      );
  }, [conversations, filter, query]);

  const open = (id: string) => {
    onClose();
    navigate(`/messages/${id}`);
  };

  return (
    <div
      role="dialog"
      aria-label="Chats"
      className="flex max-h-[min(36rem,80dvh)] w-88 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-card bg-surface shadow-card"
    >
      <header className="flex items-center justify-between gap-2 px-gutter pt-3 pb-1">
        <h2 className="text-2xl font-bold text-ink">Chats</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              onClose();
              navigate("/messages");
            }}
            aria-label="See all in Messenger"
            title="See all in Messenger"
            className="grid size-9 place-items-center rounded-pill text-ink hover:bg-surface-hover"
          >
            <Icon name="chevron-right" size={15} />
          </button>
          <button
            onClick={onCompose}
            aria-label="New message"
            title="New message"
            className="grid size-9 place-items-center rounded-pill text-ink hover:bg-surface-hover"
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

      <div className="flex gap-2 px-gutter pb-2">
        {filters.map((option) => (
          <button
            key={option.id}
            onClick={() => setFilter(option.id)}
            className={cn(
              "rounded-pill px-3 py-1 text-sm font-semibold",
              filter === option.id
                ? "bg-brand-soft text-brand"
                : "bg-surface-raised text-ink-muted hover:bg-line",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

     
      {alerts.supported && alerts.permission === "default" && (
        <div className="mx-gutter mb-2 rounded-card bg-surface-raised p-3">
          <p className="flex items-center gap-2 text-[0.95rem] font-semibold text-ink">
            <Icon name="bell-solid" size={14} className="text-brand" />
            Get notified about new messages
          </p>
          <p className="pt-1 text-xs text-ink-muted">
            Show a desktop notification when someone messages you while you are on
            another tab.
          </p>
          <button
            onClick={alerts.request}
            className="mt-2 h-9 w-full rounded-control bg-brand text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Turn on
          </button>
        </div>
      )}

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
                : query.trim()
                  ? "No chat matches that search."
                  : filter === "unread"
                    ? "Nothing unread."
                    : "No group chats yet."}
            </p>
            {conversations.length === 0 && (
              <button
                onClick={onCompose}
                className="mt-1 rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                New message
              </button>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {rows.map((row) => (
              <li key={row.id}>
                <ConversationRow conversation={row} onOpen={() => open(row.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-line p-2">
        <button
          onClick={() => {
            onClose();
            navigate("/messages");
          }}
          className="w-full rounded-lg py-2 text-center text-sm font-semibold text-brand hover:bg-surface-hover"
        >
          See all in Messenger
        </button>
      </footer>
    </div>
  );
}
