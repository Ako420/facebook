import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { GroupCard } from "../components/groups/GroupCard";
import { GroupFormModal } from "../components/groups/GroupFormModal";
import { GroupsSidebar } from "../components/groups/GroupsSidebar";
import type { GroupsView } from "../components/groups/GroupsSidebar";
import { Icon } from "../components/icons/Icon";
import { useAuth } from "../features/auth/AuthContext";
import { toApiFailure } from "../lib/api";
import { cn } from "../lib/cn";
import {
  approveGroupMember,
  joinGroup,
  listDiscoverGroups,
  listGroupInvitations,
  listMyGroups,
  removeGroupMember,
} from "../features/groups/groupApi";
import type { ApiGroup, ApiGroupInvitation } from "../features/groups/groupApi";

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export default function GroupsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = useState<GroupsView>("your");

  const [mine, setMine] = useState<ApiGroup[]>([]);
  const [discover, setDiscover] = useState<ApiGroup[]>([]);
  const [invitations, setInvitations] = useState<ApiGroupInvitation[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string[]>([]);

  const load = useCallback(async (search = "") => {
    try {
      const [joined, suggestions, invited] = await Promise.all([
        listMyGroups(),
        listDiscoverGroups(search ? { q: search } : undefined),
        listGroupInvitations(),
      ]);
      setMine(joined);
      setDiscover(suggestions);
      setInvitations(invited);
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

  // Search runs against the discover list, a beat after the typing stops.
  useEffect(() => {
    const timer = setTimeout(() => {
      listDiscoverGroups(query.trim() ? { q: query.trim() } : undefined)
        .then(setDiscover)
        .catch((caught) => setError(toApiFailure(caught).message));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const working = (id: string, on: boolean) =>
    setBusy((current) => (on ? [...current, id] : current.filter((row) => row !== id)));

  /** The group as it looks once you are in it. */
  const asMember = (group: ApiGroup): ApiGroup => ({
    ...group,
    isMember: true,
    canRead: true,
    viewerRole: "member",
    viewerStatus: "active",
    memberCount: group.memberCount + 1,
  });

  /**
   * A public group takes you straight in; a private one only files a request,
   * so its card stays where it is and starts saying so.
   */
  const join = async (group: ApiGroup) => {
    working(group.id, true);
    setNotice("");

    try {
      const { status, message } = await joinGroup(group.id);

      if (status === "requested") {
        setDiscover((current) =>
          current.map((row) =>
            row.id === group.id ? { ...row, viewerStatus: "requested" } : row,
          ),
        );
        setNotice(message);
      } else {
        setDiscover((current) => current.filter((row) => row.id !== group.id));
        setMine((current) => [asMember(group), ...current]);
      }
    } catch (caught) {
      setError(toApiFailure(caught).message);
      load(query.trim());
    } finally {
      working(group.id, false);
    }
  };

  const answerInvitation = async (invitation: ApiGroupInvitation, accept: boolean) => {
    if (!user) return;
    const { group } = invitation;

    working(group.id, true);
    setNotice("");

    try {
      if (accept) await approveGroupMember(group.id, user.id);
      else await removeGroupMember(group.id, user.id);

      setInvitations((current) => current.filter((row) => row.group.id !== group.id));
      if (accept) setMine((current) => [asMember(group), ...current]);
    } catch (caught) {
      setError(toApiFailure(caught).message);
      load(query.trim());
    } finally {
      working(group.id, false);
    }
  };

  const search = (
    <label className="relative w-full max-w-[16rem]">
      <span className="sr-only">Search groups</span>
      <Icon
        name="search"
        size={13}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
      />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search groups"
        className="h-9 w-full rounded-pill bg-surface-raised pr-3 pl-8 text-sm text-ink outline-none placeholder:text-ink-faint focus:shadow-focus"
      />
    </label>
  );

  const empty = (message: string) => (
    <div className="grid place-items-center gap-2 rounded-card bg-surface px-gutter py-10 text-center shadow-card">
      <Icon name="users" size={26} className="text-ink-faint" />
      <p className="text-sm text-ink-muted">{message}</p>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-shell">
      <GroupsSidebar
        selected={view}
        onSelect={setView}
        groups={mine}
        invitationCount={invitations.length}
        onCreate={() => setCreating(true)}
      />

      <main className="min-w-0 flex-1 px-4 py-4">
        {/* The rail is desktop-only, so the two views need their own switch
            once it is gone. */}
        <div className="mb-4 flex gap-1 rounded-card bg-surface p-1 shadow-card md:hidden">
          {(
            [
              { id: "your" as const, label: "Your groups" },
              { id: "discover" as const, label: "Discover" },
            ]
          ).map((option) => (
            <button
              key={option.id}
              onClick={() => setView(option.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-control py-2 text-sm font-semibold",
                view === option.id
                  ? "bg-brand-soft text-brand"
                  : "text-ink-muted hover:bg-surface-hover",
              )}
            >
              {option.label}
              {option.id === "your" && invitations.length > 0 && (
                <span className="rounded-pill bg-alert px-1.5 text-xs text-white">
                  {invitations.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-card bg-surface px-gutter py-3 text-sm text-alert shadow-card"
          >
            {error}
          </p>
        )}

        {notice && (
          <p className="mb-4 flex items-center gap-2 rounded-card bg-surface px-gutter py-3 text-sm text-ink-muted shadow-card">
            <Icon name="clock" size={13} className="text-brand" />
            {notice}
          </p>
        )}

        {loading ? (
          <p className="py-6 text-sm text-ink-muted">Loading groups…</p>
        ) : view === "your" ? (
          <>
            {invitations.length > 0 && (
              <Section title={`Invitations (${invitations.length})`}>
                <div className={grid}>
                  {invitations.map((invitation) => (
                    <div key={invitation.group.id} className="flex flex-col">
                      <GroupCard
                        group={invitation.group}
                        primaryLabel="Accept"
                        pending={busy.includes(invitation.group.id)}
                        onPrimary={() => answerInvitation(invitation, true)}
                        secondaryLabel="Decline"
                        onSecondary={() => answerInvitation(invitation, false)}
                      />
                      {invitation.invitedBy?.name && (
                        <p className="px-3 pt-1.5 text-xs text-ink-faint">
                          Invited by {invitation.invitedBy.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section
              title={`Your groups (${mine.length})`}
              action={
                <button
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-2 rounded-control bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand/25"
                >
                  <Icon name="plus" size={12} />
                  Create
                </button>
              }
            >
              {mine.length === 0 ? (
                empty("You have not joined a group yet. Try Discover, or create your own.")
              ) : (
                <div className={grid}>
                  {mine.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      primaryLabel="View group"
                      onPrimary={() => navigate(`/groups/${group.id}`)}
                    />
                  ))}
                </div>
              )}
            </Section>
          </>
        ) : (
          <Section title="Groups you can join" action={search}>
            {discover.length === 0 ? (
              empty(
                query.trim()
                  ? `No group matches “${query.trim()}”.`
                  : "There is nothing new to suggest right now.",
              )
            ) : (
              <div className={grid}>
                {discover.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    pending={busy.includes(group.id)}
                    onPrimary={() => join(group)}
                    secondaryLabel="Preview"
                    onSecondary={() => navigate(`/groups/${group.id}`)}
                  />
                ))}
              </div>
            )}
          </Section>
        )}
      </main>

      {creating && (
        <GroupFormModal
          onClose={() => setCreating(false)}
          onSaved={(group) => {
            setMine((current) => [group, ...current]);
            navigate(`/groups/${group.id}`);
          }}
        />
      )}
    </div>
  );
}
