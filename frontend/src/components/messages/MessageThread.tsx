import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { chatAvatar } from "./ChatsPanel";
import { ChatDetails } from "./ChatDetails";
import { useAuth } from "../../features/auth/AuthContext";
import { formatClock, formatRelativeTime } from "../../lib/format";
import { toApiFailure } from "../../lib/api";
import { cn } from "../../lib/cn";
import { toPerson } from "../../features/friends/friendApi";
import { uploadMedia } from "../../features/posts/postApi";
import type { UploadedMedia } from "../../features/posts/postApi";
import {
  editMessage,
  fetchConversation,
  hideMessage,
  listMessages,
  markConversationRead,
  sendMessage,
  unsendMessage,
} from "../../features/messages/messageApi";
import type { ApiConversation, ApiMessage } from "../../features/messages/messageApi";
import { useMessages } from "../../features/messages/MessagesProvider";

type Removal = { message: ApiMessage; scope: "me" | "everyone" };

/** Newest-last, which is the order a thread reads in. */
const chronological = (rows: ApiMessage[]) =>
  [...rows].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

function Attachment({ media }: { media: UploadedMedia }) {
  if (media.type === "video") {
    return (
      <video
        src={media.url}
        poster={media.poster}
        controls
        preload="metadata"
        className="max-h-72 w-full rounded-media bg-black object-cover"
      />
    );
  }

  return (
    <img
      src={media.url}
      alt=""
      loading="lazy"
      className="max-h-72 w-full rounded-media bg-surface-raised object-cover"
    />
  );
}

function Bubble({
  message,
  showAvatar,
  onEdit,
  onUnsend,
  onHide,
}: {
  message: ApiMessage;
  showAvatar: boolean;
  onEdit: () => void;
  onUnsend: () => void;
  onHide: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mine = message.fromViewer;
  const person = toPerson(message.sender);

  return (
    <li
      className={cn("flex items-end gap-2", mine ? "flex-row-reverse" : "flex-row")}
      onMouseLeave={() => setMenuOpen(false)}
    >
      <span className="w-7 shrink-0">
        {!mine && showAvatar && (
          <Avatar src={person.avatar} alt={person.name} size={28} />
        )}
      </span>

      <div
        className={cn(
          "flex min-w-0 max-w-[min(28rem,78%)] flex-col",
          mine && "items-end",
        )}
      >
        {message.deleted ? (
          <p className="rounded-card border border-line px-3 py-2 text-sm text-ink-faint italic">
            Message unsent
          </p>
        ) : (
          <div
            className={cn(
              "flex min-w-0 flex-col gap-1 rounded-card px-3 py-2",
              mine ? "bg-brand text-white" : "bg-surface-raised text-ink",
            )}
          >
            {message.attachments.map((media) => (
              <Attachment key={media.url} media={media} />
            ))}
            {message.text && (
              <p className="text-[0.95rem] whitespace-pre-wrap wrap-anywhere">
                {message.text}
              </p>
            )}
          </div>
        )}

        <p className="px-1 pt-0.5 text-[0.65rem] text-ink-faint">
          {formatClock(message.createdAt)}
          {message.editedAt && !message.deleted && " · edited"}
        </p>
      </div>

      <div className="relative self-center">
        <button
          aria-label="Message options"
          onClick={() => setMenuOpen((value) => !value)}
          className="grid size-7 place-items-center rounded-pill text-ink-faint hover:bg-surface-hover"
        >
          <Icon name="dots" size={13} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className={cn(
              "absolute bottom-full z-20 mb-1 w-48 rounded-card bg-surface p-1 shadow-card",
              mine ? "left-0" : "right-0",
            )}
          >
            {message.canEdit && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-ink hover:bg-surface-hover"
              >
                <Icon name="edit" size={12} />
                Edit
              </button>
            )}

            <button
              onClick={() => {
                setMenuOpen(false);
                onHide();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-ink hover:bg-surface-hover"
            >
              <Icon name="close" size={12} />
              Remove for you
            </button>

            {message.canUnsend && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onUnsend();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-alert hover:bg-surface-hover"
              >
                <Icon name="close" size={12} />
                Remove for everyone
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function MessageThread({ conversationId }: { conversationId: string }) {
  const navigate = useNavigate();
  const { conversations, clearUnread, setActiveConversation, refresh } = useMessages();
  const { user: account } = useAuth();
  const [showDetails, setShowDetails] = useState(false);

  const [conversation, setConversation] = useState<ApiConversation | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Removal | null>(null);

  const bottom = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const inboxRow = conversations.find((row) => row.id === conversationId);
  const newestSeen = inboxRow?.lastMessage?.id ?? null;

  const scrollDown = useCallback(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [chat, page] = await Promise.all([
        fetchConversation(conversationId),
        listMessages(conversationId, { limit: 30 }),
      ]);

      setConversation(chat);
      setMessages(chronological(page.messages));
      setCursor(page.nextCursor);
      setError("");

      await markConversationRead(conversationId);
      clearUnread(conversationId);
    } catch (caught) {
      setError(toApiFailure(caught).message);
    } finally {
      setLoading(false);
    }
  }, [conversationId, clearUnread]);

  useEffect(() => {
    setActiveConversation(conversationId);
    load();

    return () => setActiveConversation(null);
  }, [conversationId, load, setActiveConversation]);

  useEffect(() => {
    if (!loading) scrollDown();
  }, [loading, messages.length, scrollDown]);

  /** Pulls anything that landed since user last open chat, then marks it read. */
  useEffect(() => {
    if (!newestSeen || loading) return;
    if (messages.some((row) => row.id === newestSeen)) return;

    let cancelled = false;

    listMessages(conversationId, { limit: 30 })
      .then(async (page) => {
        if (cancelled) return;

        setMessages((current) => {
          const known = new Set(current.map((row) => row.id));
          const fresh = page.messages.filter((row) => !known.has(row.id));
          return fresh.length === 0 ? current : chronological([...current, ...fresh]);
        });

        await markConversationRead(conversationId);
        clearUnread(conversationId);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [newestSeen, conversationId, messages, loading, clearUnread]);

  const loadOlder = async () => {
    if (!cursor) return;

    try {
      const page = await listMessages(conversationId, { limit: 30, before: cursor });
      setMessages((current) => chronological([...page.messages, ...current]));
      setCursor(page.nextCursor);
    } catch (caught) {
      setError(toApiFailure(caught).message);
    }
  };

  const submit = async () => {
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || sending) return;

    setSending(true);
    setError("");

    try {
      if (editingId) {
        const updated = await editMessage(conversationId, editingId, trimmed);
        setMessages((current) =>
          current.map((row) => (row.id === updated.id ? updated : row)),
        );
        setEditingId(null);
      } else {
        const attachments = files.length > 0 ? await uploadMedia(files) : undefined;
        const sent = await sendMessage(conversationId, {
          ...(trimmed ? { text: trimmed } : {}),
          ...(attachments ? { attachments } : {}),
        });
        setMessages((current) => chronological([...current, sent]));
      }

      setText("");
      setFiles([]);
      refresh();
    } catch (caught) {
      setError(toApiFailure(caught).message);
    } finally {
      setSending(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    const { message, scope } = removing;

    setSending(true);

    try {
      if (scope === "me") {
        await hideMessage(conversationId, message.id);
        setMessages((current) => current.filter((row) => row.id !== message.id));
      } else {
        await unsendMessage(conversationId, message.id);
        setMessages((current) =>
          current.map((row) =>
            row.id === message.id
              ? { ...row, deleted: true, text: "", attachments: [], canEdit: false, canUnsend: false }
              : row,
          ),
        );
      }

      setRemoving(null);
      refresh();
    } catch (caught) {
      setError(toApiFailure(caught).message);
      setRemoving(null);
    } finally {
      setSending(false);
    }
  };

  if (loading && !conversation) {
    return <p className="p-6 text-sm text-ink-muted">Loading chat…</p>;
  }

  if (!conversation) {
    return (
      <div className="grid place-items-center gap-2 p-10 text-center">
        <Icon name="messenger" size={26} className="text-ink-faint" />
        <p className="text-[0.95rem] font-semibold text-ink">This chat is not available</p>
        <p className="text-sm text-ink-muted">{error || "It may have been deleted."}</p>
      </div>
    );
  }

  const subtitle =
    conversation.type === "group"
      ? `${conversation.participants.length} people`
      : conversation.lastMessage
        ? `Active ${formatRelativeTime(conversation.lastMessage.sentAt)} ago`
        : "Say hello";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-line px-gutter py-2">
        <button
          onClick={() => navigate("/messages")}
          aria-label="Back to chats"
          className="grid size-9 place-items-center rounded-pill text-ink hover:bg-surface-hover lg:hidden"
        >
          <Icon name="chevron-left" size={15} />
        </button>

        <Avatar src={chatAvatar(conversation)} alt={conversation.title} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem] font-semibold text-ink">
            {conversation.title}
          </p>
          <p className="truncate text-xs text-ink-muted">{subtitle}</p>
        </div>

        <button
          onClick={() => setShowDetails(true)}
          aria-label="Chat details"
          title="Chat details"
          className="grid size-9 place-items-center rounded-pill text-brand hover:bg-surface-hover"
        >
          <Icon name="info" size={17} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-gutter py-3">
        {cursor && (
          <div className="pb-3 text-center">
            <button
              onClick={loadOlder}
              className="rounded-pill bg-surface-raised px-3 py-1.5 text-xs font-semibold text-ink hover:bg-line"
            >
              Load older messages
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="grid place-items-center gap-2 py-10 text-center">
            <Avatar src={chatAvatar(conversation)} alt={conversation.title} size={64} />
            <p className="text-[0.95rem] font-semibold text-ink">{conversation.title}</p>
            <p className="text-sm text-ink-muted">
              No messages yet. Say something to start the thread.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 ">
            {messages.map((message, index) => (
              <Bubble
                key={message.id}
                message={message}
                showAvatar={messages[index + 1]?.sender.id !== message.sender.id}
                onEdit={() => {
                  setEditingId(message.id);
                  setText(message.text);
                }}
                onUnsend={() => setRemoving({ message, scope: "everyone" })}
                onHide={() => setRemoving({ message, scope: "me" })}
              />
            ))}
          </ul>
        )}

        <div ref={bottom} />
      </div>

      {error && (
        <p role="alert" className="mx-gutter mb-2 rounded-media bg-alert-soft px-3 py-2 text-sm text-ink">
          {error}
        </p>
      )}

      <footer className="border-t border-line px-gutter py-2">
        {editingId && (
          <p className="flex items-center justify-between gap-2 pb-1 text-xs text-ink-muted">
            Editing a message
            <button
              onClick={() => {
                setEditingId(null);
                setText("");
              }}
              className="font-semibold text-brand hover:underline"
            >
              Cancel
            </button>
          </p>
        )}

        {files.length > 0 && (
          <ul className="flex flex-wrap gap-2 pb-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 rounded-pill bg-surface-raised px-3 py-1 text-xs text-ink"
              >
                <Icon name={file.type.startsWith("video/") ? "video-camera" : "image"} size={11} />
                <span className="max-w-32 truncate">{file.name}</span>
                <button
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                  className="text-ink-faint hover:text-ink"
                >
                  <Icon name="close" size={10} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-2">
          <button
            aria-label="Add photo or video"
            disabled={Boolean(editingId) || sending}
            onClick={() => fileInput.current?.click()}
            className="grid size-9 shrink-0 place-items-center rounded-pill text-brand hover:bg-surface-hover disabled:opacity-40"
          >
            <Icon name="image-solid" size={17} />
          </button>

          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(event) => {
              setFiles((current) => [...current, ...Array.from(event.target.files ?? [])]);
              event.target.value = "";
            }}
          />

          <textarea
            rows={1}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="Aa"
            className="max-h-28 min-h-9 flex-1 resize-none rounded-card bg-surface-raised px-3 py-2 text-[0.95rem] text-ink outline-none placeholder:text-ink-faint focus:shadow-focus"
          />

          <button
            aria-label="Send"
            onClick={submit}
            disabled={sending || (!text.trim() && files.length === 0)}
            className="grid size-9 shrink-0 place-items-center rounded-pill text-brand hover:bg-surface-hover disabled:opacity-40"
          >
            <Icon name="send" size={16} />
          </button>
        </div>
      </footer>

      {showDetails && account && (
        <ChatDetails
          conversation={conversation}
          viewerId={account.id}
          onClose={() => setShowDetails(false)}
          onChanged={() => {
            fetchConversation(conversationId)
              .then(setConversation)
              .catch(() => undefined);
            refresh();
          }}
          onGone={() => {
            setShowDetails(false);
            refresh();
            navigate("/messages");
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title={
            removing.scope === "me" ? "Remove for you?" : "Remove for everyone?"
          }
          message={
            removing.scope === "me"
              ? "It disappears from your thread only. Everyone else in this chat keeps it, and this cannot be undone."
              : "It goes from this chat for everyone, leaving a note that a message was removed. Any photo or video goes with it."
          }
          confirmLabel={sending ? "Removing..." : "Remove"}
          pending={sending}
          onConfirm={remove}
          onCancel={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
