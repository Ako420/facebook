import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { chatAvatar } from "./ChatsPanel";
import { cn } from "../../lib/cn";
import { toApiFailure } from "../../lib/api";
import { listFriends, toPerson } from "../../features/friends/friendApi";
import type { ApiPerson } from "../../features/friends/friendApi";
import {
  addParticipants,
  deleteConversation,
  leaveConversation,
  removeParticipant,
  updateConversation,
} from "../../features/messages/messageApi";
import type { ApiConversation, ApiParticipant } from "../../features/messages/messageApi";

type Confirm =
  | { kind: "leave" }
  | { kind: "delete" }
  | { kind: "remove"; participant: ApiParticipant };

/**
 * Everything about a chat that is not a message: who is in it, what it is
 * called, and how to get out of it. A group chat you could create but never
 * name, grow or leave was only half a feature.
 */
export function ChatDetails({
  conversation,
  viewerId,
  onClose,
  onChanged,
  onGone,
}: {
  conversation: ApiConversation;
  viewerId: string;
  onClose: () => void;
  /** Something about the chat changed; the thread should re-read it. */
  onChanged: () => void;
  /** You left or deleted it, so there is nothing left to show here. */
  onGone: () => void;
}) {
  const navigate = useNavigate();
  const isGroup = conversation.type === "group";
  const isAdmin = conversation.viewerRole === "admin";

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(conversation.name);
  const [adding, setAdding] = useState(false);
  const [friends, setFriends] = useState<ApiPerson[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const other = conversation.participants.find((row) => row.user.id !== viewerId);
  const inChat = useMemo(
    () => new Set(conversation.participants.map((row) => row.user.id)),
    [conversation.participants],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy && !confirming) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy, confirming]);

  // Friends are only worth fetching once someone actually wants to add one.
  useEffect(() => {
    if (!adding || friends.length > 0) return;
    listFriends()
      .then((lists) => setFriends(lists.friends.map((edge) => edge.user)))
      .catch((caught) => setError(toApiFailure(caught).message));
  }, [adding, friends.length]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (caught) {
      setError(toApiFailure(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const saveName = () =>
    run(async () => {
      await updateConversation(conversation.id, { name: name.trim() });
      setRenaming(false);
      onChanged();
    });

  const addPicked = () =>
    run(async () => {
      await addParticipants(conversation.id, picked);
      setPicked([]);
      setAdding(false);
      onChanged();
    });

  const confirm = () => {
    if (!confirming) return;

    return run(async () => {
      if (confirming.kind === "remove") {
        await removeParticipant(conversation.id, confirming.participant.user.id);
        setConfirming(null);
        onChanged();
        return;
      }

      if (confirming.kind === "leave") await leaveConversation(conversation.id);
      else await deleteConversation(conversation.id);

      setConfirming(null);
      onGone();
    });
  };

  const addable = friends.filter((person) => !inChat.has(person.id));

  return (
    <div className="fixed inset-0 z-100 flex justify-end bg-black/50" onClick={() => !busy && onClose()}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Chat details"
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-[24rem] flex-col bg-surface shadow-card"
      >
        <header className="flex items-center gap-2 border-b border-line px-gutter py-3">
          {adding && (
            <button
              aria-label="Back to details"
              onClick={() => {
                setAdding(false);
                setPicked([]);
              }}
              className="grid size-9 place-items-center rounded-pill text-ink hover:bg-surface-hover"
            >
              <Icon name="chevron-left" size={15} />
            </button>
          )}
          <h2 className="flex-1 text-lg font-bold text-ink">
            {adding ? "Add people" : "Chat details"}
          </h2>
          <button
            aria-label="Close"
            disabled={busy}
            onClick={onClose}
            className="grid size-9 place-items-center rounded-pill bg-surface-raised text-ink hover:bg-line disabled:opacity-50"
          >
            <Icon name="close" size={15} />
          </button>
        </header>

        {error && (
          <p role="alert" className="mx-gutter mt-3 rounded-media bg-alert-soft px-3 py-2 text-sm text-ink">
            {error}
          </p>
        )}

        {adding ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {friends.length === 0 && !error ? (
                <p className="px-2 py-6 text-center text-sm text-ink-muted">Loading friends…</p>
              ) : addable.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-ink-muted">
                  Everyone you know is already in this chat.
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {addable.map((person) => {
                    const on = picked.includes(person.id);
                    return (
                      <li key={person.id}>
                        <button
                          aria-pressed={on}
                          onClick={() =>
                            setPicked((current) =>
                              on ? current.filter((id) => id !== person.id) : [...current, person.id],
                            )
                          }
                          className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-hover"
                        >
                          <Avatar src={toPerson(person).avatar} alt={person.name ?? ""} size={36} />
                          <span className="min-w-0 flex-1 truncate text-[0.95rem] font-semibold text-ink">
                            {person.name}
                          </span>
                          <span
                            className={cn(
                              "grid size-5 shrink-0 place-items-center rounded-sm border",
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
              <button
                onClick={addPicked}
                disabled={picked.length === 0 || busy}
                className={cn(
                  "h-10 w-full rounded-control text-sm font-semibold",
                  picked.length > 0 && !busy
                    ? "bg-brand text-white hover:bg-brand-hover"
                    : "cursor-not-allowed bg-surface-raised text-ink-faint",
                )}
              >
                {busy
                  ? "Adding…"
                  : picked.length === 0
                    ? "Pick people to add"
                    : `Add ${picked.length} ${picked.length === 1 ? "person" : "people"}`}
              </button>
            </footer>
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid justify-items-center gap-2 px-gutter pt-6 pb-4 text-center">
              <Avatar src={chatAvatar(conversation)} alt={conversation.title} size={72} />

              {renaming ? (
                <div className="flex w-full gap-2">
                  <input
                    autoFocus
                    value={name}
                    maxLength={75}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") saveName();
                      if (event.key === "Escape") {
                        event.stopPropagation();
                        setRenaming(false);
                        setName(conversation.name);
                      }
                    }}
                    placeholder="Chat name"
                    className="h-9 min-w-0 flex-1 rounded-control bg-surface-raised px-3 text-sm text-ink outline-none focus:shadow-focus"
                  />
                  <button
                    onClick={saveName}
                    disabled={busy}
                    className="rounded-control bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-lg font-bold text-ink">
                  <span className="truncate">{conversation.title}</span>
                  {isGroup && isAdmin && (
                    <button
                      aria-label="Rename chat"
                      onClick={() => setRenaming(true)}
                      className="grid size-7 place-items-center rounded-pill text-ink-muted hover:bg-surface-hover"
                    >
                      <Icon name="edit" size={12} />
                    </button>
                  )}
                </p>
              )}

              {isGroup ? (
                <p className="text-sm text-ink-muted">
                  Group chat · {conversation.participants.length} people
                </p>
              ) : (
                other && (
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/profile/${other.user.id}`);
                    }}
                    className="text-sm font-semibold text-brand hover:underline"
                  >
                    View profile
                  </button>
                )
              )}
            </div>

            {isGroup && (
              <section className="border-t border-line px-2 py-3">
                <div className="flex items-center justify-between px-2 pb-1">
                  <h3 className="text-sm font-semibold text-ink-muted">People</h3>
                  <button
                    onClick={() => setAdding(true)}
                    className="flex items-center gap-1.5 rounded-control bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand/25"
                  >
                    <Icon name="user-plus" size={12} />
                    Add people
                  </button>
                </div>

                <ul className="flex flex-col gap-0.5">
                  {conversation.participants.map((row) => {
                    const person = toPerson(row.user);
                    const isSelf = row.user.id === viewerId;

                    return (
                      <li key={row.id} className="flex items-center gap-3 rounded-lg p-2">
                        <Avatar src={person.avatar} alt={person.name} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.95rem] font-semibold text-ink">
                            {person.name}
                            {isSelf && <span className="font-normal text-ink-faint"> (you)</span>}
                          </span>
                          {row.role === "admin" && (
                            <span className="text-xs font-medium text-brand">Admin</span>
                          )}
                        </span>

                        {isAdmin && !isSelf && (
                          <button
                            onClick={() => setConfirming({ kind: "remove", participant: row })}
                            className="rounded-control bg-surface-raised px-3 py-1 text-xs font-semibold text-ink hover:bg-line"
                          >
                            Remove
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section className="flex flex-col gap-1 border-t border-line px-2 py-3">
              {isGroup && (
                <button
                  onClick={() => setConfirming({ kind: "leave" })}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-alert hover:bg-surface-hover"
                >
                  <Icon name="chevron-left" size={14} />
                  Leave group chat
                </button>
              )}
              <button
                onClick={() => setConfirming({ kind: "delete" })}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-ink hover:bg-surface-hover"
              >
                <Icon name="close" size={14} />
                Delete chat
              </button>
            </section>
          </div>
        )}
      </aside>

      {confirming && (
        <ConfirmDialog
          title={
            confirming.kind === "leave"
              ? "Leave group chat?"
              : confirming.kind === "delete"
                ? "Delete chat?"
                : "Remove from chat?"
          }
          message={
            confirming.kind === "leave"
              ? "You will stop getting messages from this chat. Someone inside will have to add you back."
              : confirming.kind === "delete"
                ? "It disappears from your inbox, and the messages so far are gone for you. Everyone else keeps them, and a new message brings the chat back."
                : `${confirming.participant.user.name ?? "They"} will be taken out of the chat and stop seeing new messages.`
          }
          confirmLabel={
            busy
              ? "Working…"
              : confirming.kind === "leave"
                ? "Leave"
                : confirming.kind === "delete"
                  ? "Delete"
                  : "Remove"
          }
          pending={busy}
          onConfirm={confirm}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
