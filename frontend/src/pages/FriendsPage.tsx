import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { FriendsSidebar } from "../components/friends/FriendsSidebar";
import { PersonCard, RequestCard } from "../components/friends/PersonCard";
import { Icon } from "../components/icons/Icon";
import { Avatar } from "../components/ui/Avatar";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useNavigate } from "react-router-dom";
import { toApiFailure } from "../lib/api";
import {
  isBirthdayToday,
  listFriends,
  listSuggestions,
  removeFriend,
  respondToRequest,
  sendFriendRequest,
  toPerson,
} from "../features/friends/friendApi";
import type { ApiPerson, FriendEdge } from "../features/friends/friendApi";
import { useRealtimeEvent } from "../features/realtime/RealtimeProvider";

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: string;
  children: ReactNode;
}) {
  return (
    <section className="pb-6">
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {action && (
          <button className="rounded-control px-2 py-1 text-sm text-brand hover:bg-surface-hover">
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

const grid = "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

export default function FriendsPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("home");

  const [friends, setFriends] = useState<FriendEdge[]>([]);
  const [incoming, setIncoming] = useState<FriendEdge[]>([]);
  const [outgoing, setOutgoing] = useState<FriendEdge[]>([]);
  const [suggestions, setSuggestions] = useState<ApiPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /** Ids of people a request was just sent to, so their card reads "Request sent". */
  const [requested, setRequested] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<
    { edge: FriendEdge; kind: "unfriend" | "decline" | "cancel" } | null
  >(null);
  const [busy, setBusy] = useState(false);

  const birthdayFriends = friends
    .filter((edge) => isBirthdayToday(edge.user.birthday))
    .map((edge) => toPerson(edge.user));

  const load = useCallback(async () => {
    try {
      const [lists, people] = await Promise.all([listFriends(), listSuggestions()]);
      setFriends(lists.friends);
      setIncoming(lists.incoming);
      setOutgoing(lists.outgoing);
      setSuggestions(people);
      setError("");
    } catch (caught) {
      setError(toApiFailure(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeEvent("friends:changed", () => {
    load();
  });

  const confirm = async (edge: FriendEdge) => {
    setIncoming((current) => current.filter((row) => row.id !== edge.id));
    setFriends((current) => [{ ...edge, status: "accepted" }, ...current]);

    try {
      await respondToRequest(edge.id, "accepted");
    } catch (caught) {
      setError(toApiFailure(caught).message);
      load();
    }
  };

  // Unfriend, decline and cancel all delete the same row, so one handler
  // covers them once the person has confirmed.
  const confirmRemoval = async () => {
    if (!confirming) return;

    const { edge, kind } = confirming;
    setBusy(true);

    try {
      await removeFriend(edge.id);

      if (kind === "unfriend") {
        setFriends((current) => current.filter((row) => row.id !== edge.id));
        setSuggestions((current) => [edge.user, ...current]);
      } else if (kind === "decline") {
        setIncoming((current) => current.filter((row) => row.id !== edge.id));
      } else {
        setOutgoing((current) => current.filter((row) => row.id !== edge.id));
        setRequested((current) => current.filter((id) => id !== edge.user.id));
      }

      setConfirming(null);
    } catch (caught) {
      setError(toApiFailure(caught).message);
      setConfirming(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const confirmCopy = {
    unfriend: {
      title: "Remove friend?",
      message: `${confirming?.edge.user.name ?? "This person"} will be removed from your friends. You can send a new request later.`,
      label: "Remove",
    },
    decline: {
      title: "Delete request?",
      message: `This turns down the friend request from ${confirming?.edge.user.name ?? "this person"}.`,
      label: "Delete",
    },
    cancel: {
      title: "Cancel request?",
      message: `Your friend request to ${confirming?.edge.user.name ?? "this person"} will be withdrawn.`,
      label: "Cancel request",
    },
  };

  const add = async (person: ApiPerson) => {
    setRequested((current) => [...current, person.id]);

    try {
      await sendFriendRequest(person.id);
      // Refresh so the new row lands in `outgoing` with its real id.
      load();
    } catch (caught) {
      setRequested((current) => current.filter((id) => id !== person.id));
      setError(toApiFailure(caught).message);
    }
  };

  const dismiss = (person: ApiPerson) =>
    setSuggestions((current) => current.filter((row) => row.id !== person.id));

  const pendingIds = new Set(outgoing.map((row) => row.user.id));
  const visibleSuggestions = suggestions.filter((person) => !pendingIds.has(person.id));

  return (
    <div className="mx-auto flex w-full max-w-shell">
      <FriendsSidebar
        selected={selected}
        onSelect={setSelected}
        requestCount={incoming.length}
      />

      <main className="min-w-0 flex-1 px-4 py-4">
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-card bg-surface px-gutter py-3 text-sm text-alert shadow-card"
          >
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-6 text-sm text-ink-muted">Loading friends…</p>
        ) : (
          <>
            {incoming.length > 0 && (
              <Section title={`Friend requests (${incoming.length})`} action="See all">
                <div className={grid}>
                  {incoming.map((edge) => (
                    <RequestCard
                      key={edge.id}
                      user={toPerson(edge.user)}
                      sentAt={edge.createdAt}
                      mutual={0}
                      confirmed={false}
                      onConfirm={() => confirm(edge)}
                      onDelete={() => setConfirming({ edge, kind: "decline" })}
                    />
                  ))}
                </div>
              </Section>
            )}

            {outgoing.length > 0 && (
              <Section title={`Requests sent (${outgoing.length})`}>
                <div className={grid}>
                  {outgoing.map((edge) => (
                    <PersonCard
                      key={edge.id}
                      user={toPerson(edge.user)}
                      caption="Request pending"
                      primaryLabel="Request sent"
                      secondaryLabel="Cancel"
                      done
                      doneLabel="Request sent"
                      onPrimary={() => undefined}
                      onSecondary={() => setConfirming({ edge, kind: "cancel" })}
                    />
                  ))}
                </div>
              </Section>
            )}

            <Section title="People you may know" action="See all">
              {visibleSuggestions.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No one new to suggest right now.
                </p>
              ) : (
                <div className={grid}>
                  {visibleSuggestions.map((person) => (
                    <PersonCard
                      key={person.id}
                      user={toPerson(person)}
                      primaryLabel="Add friend"
                      secondaryLabel="Remove"
                      done={requested.includes(person.id)}
                      onPrimary={() => add(person)}
                      onSecondary={() => dismiss(person)}
                    />
                  ))}
                </div>
              )}
            </Section>

                        <Section title="Birthdays">
              <ul className="flex flex-col gap-1 rounded-card bg-surface p-2 shadow-card">
                {birthdayFriends.length === 0 && (
                  <li className="px-2 py-1.5 text-sm text-ink-muted">
                    No birthdays today.
                  </li>
                )}
                {birthdayFriends.map((user) => (
                  <li key={user.id}>
                    <button
                      onClick={() => navigate(`/profile/${user.id}`)}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-hover"
                    >
                      <Avatar src={user.avatar} alt={user.name} size={40} online={user.isOnline} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.95rem] font-semibold text-ink">
                          {user.name}
                        </span>
                        <span className="block truncate text-xs text-ink-faint">
                          {user.mutualFriendCount} mutual friends
                        </span>
                      </span>
                      <Icon name="gift" size={18} className="text-[#f3425f]" />
                    </button>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title={`All friends (${friends.length})`} action="See all">
              {friends.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  You have not added anyone yet.
                </p>
              ) : (
                <div className={grid}>
                  {friends.map((edge) => (
                    <PersonCard
                      key={edge.id}
                      user={toPerson(edge.user)}
                      primaryLabel="Message"
                      secondaryLabel="Unfriend"
                      onPrimary={() => undefined}
                      onSecondary={() => setConfirming({ edge, kind: "unfriend" })}
                    />
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </main>

      {confirming && (
        <ConfirmDialog
          title={confirmCopy[confirming.kind].title}
          message={confirmCopy[confirming.kind].message}
          confirmLabel={busy ? "Working..." : confirmCopy[confirming.kind].label}
          pending={busy}
          onConfirm={confirmRemoval}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
