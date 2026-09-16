import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Composer } from "../components/feed/Composer";
import { PostCard } from "../components/feed/PostCard";
import { GroupFormModal } from "../components/groups/GroupFormModal";
import { GroupsSidebar } from "../components/groups/GroupsSidebar";
import { InvitePeopleModal } from "../components/groups/InvitePeopleModal";
import { MemberRow } from "../components/groups/MemberRow";
import { MemberOptions } from "../components/groups/MemberOptions";
import type { MemberOption } from "../components/groups/MemberOptions";
import { Icon } from "../components/icons/Icon";
import { Card } from "../components/ui/Card";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useAuth } from "../features/auth/AuthContext";
import { usePublishedPosts } from "../features/uploads/UploadsProvider";
import { toApiFailure } from "../lib/api";
import { formatCount } from "../lib/format";
import { cn } from "../lib/cn";
import {
  approveGroupMember,
  deleteGroup,
  describePrivacy,
  fetchGroup,
  groupCover,
  joinGroup,
  joinLabel,
  leaveGroup,
  listGroupMembers,
  listMyGroups,
  removeGroupMember,
  setGroupMemberRole,
} from "../features/groups/groupApi";
import type { ApiGroup, ApiGroupMember } from "../features/groups/groupApi";
import { listPosts, toFeedPost } from "../features/posts/postApi";
import type { ApiPost } from "../features/posts/postApi";

type Tab = "discussion" | "members";
type Pending =
  | { kind: "leave" | "delete" }
  | { kind: "remove" | "promote" | "demote"; member: ApiGroupMember };

export default function GroupPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user: account } = useAuth();

  const [group, setGroup] = useState<ApiGroup | null>(null);
  const [members, setMembers] = useState<ApiGroupMember[]>([]);
  const [invited, setInvited] = useState<ApiGroupMember[]>([]);
  const [requests, setRequests] = useState<ApiGroupMember[]>([]);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [mine, setMine] = useState<ApiGroup[]>([]);

  const [tab, setTab] = useState<Tab>("discussion");
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [confirming, setConfirming] = useState<Pending | null>(null);

  /** The rail lists your groups on every page, so it reloads alongside. */
  const loadRail = useCallback(() => {
    listMyGroups()
      .then(setMine)
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setMissing(false);

    try {
      const found = await fetchGroup(id);
      setGroup(found);

      // A private group you are not in hands back its card and nothing else.
      if (!found.canRead) {
        setMembers([]);
        setInvited([]);
        setRequests([]);
        setPosts([]);
        setError("");
        return;
      }

      const [people, feed] = await Promise.all([
        listGroupMembers(id),
        listPosts({ groupId: id }),
      ]);
      setMembers(people);
      setPosts(feed);

      setInvited(found.isMember ? await listGroupMembers(id, { status: "invited" }) : []);
      setRequests(
        found.viewerRole === "admin"
          ? await listGroupMembers(id, { status: "requested" })
          : [],
      );
      setError("");
    } catch (caught) {
      const failure = toApiFailure(caught);
      if (failure.status === 404) setMissing(true);
      else setError(failure.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    loadRail();
  }, [load, loadRail]);

  usePublishedPosts((post) => {
    if (post.groupId !== id) return;
    setPosts((current) => [post, ...current]);
  });

  /** Public groups let you in; private ones take the request and wait. */
  const join = async () => {
    if (!group) return;
    setBusy(true);
    setNotice("");

    try {
      const { status, message } = await joinGroup(group.id);

      if (status === "requested") {
        setGroup({ ...group, viewerStatus: "requested" });
        setNotice(message);
      } else {
        await load();
        loadRail();
      }
    } catch (caught) {
      setError(toApiFailure(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = async () => {
    if (!group || !account) return;
    setBusy(true);

    try {
      await removeGroupMember(group.id, account.id);
      setGroup({ ...group, viewerStatus: null });
      setNotice("");
    } catch (caught) {
      setError(toApiFailure(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const answerRequest = async (row: ApiGroupMember, accept: boolean) => {
    if (!group) return;
    setBusy(true);
    setError("");

    try {
      if (accept) {
        await approveGroupMember(group.id, row.user.id);
        setMembers((current) => [...current, { ...row, status: "active" }]);
        setGroup({ ...group, memberCount: group.memberCount + 1 });
      } else {
        await removeGroupMember(group.id, row.user.id);
      }
      setRequests((current) => current.filter((item) => item.id !== row.id));
    } catch (caught) {
      setError(toApiFailure(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const withdrawInvite = async (row: ApiGroupMember) => {
    if (!group) return;
    setBusy(true);

    try {
      await removeGroupMember(group.id, row.user.id);
      setInvited((current) => current.filter((item) => item.id !== row.id));
    } catch (caught) {
      setError(toApiFailure(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const act = async () => {
    if (!group || !confirming) return;
    setBusy(true);
    setError("");

    try {
      if (confirming.kind === "leave") {
        await leaveGroup(group.id);
        setConfirming(null);
        await load();
        loadRail();
      } else if (confirming.kind === "delete") {
        await deleteGroup(group.id);
        setConfirming(null);
        navigate("/groups");
      } else if (confirming.kind === "promote" || confirming.kind === "demote") {
        const role = confirming.kind === "promote" ? "admin" : "member";
        await setGroupMemberRole(group.id, confirming.member.user.id, role);
        setMembers((current) =>
          current.map((row) => (row.id === confirming.member.id ? { ...row, role } : row)),
        );
        setConfirming(null);
      } else {
        await removeGroupMember(group.id, confirming.member.user.id);
        setMembers((current) => current.filter((row) => row.id !== confirming.member.id));
        setGroup((current) =>
          current ? { ...current, memberCount: Math.max(0, current.memberCount - 1) } : current,
        );
        setConfirming(null);
      }
    } catch (caught) {
      // The last admin cannot leave, so that answer belongs on the page.
      setError(toApiFailure(caught).message);
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  };

  const shell = (children: ReactNode) => (
    <div className="mx-auto flex w-full max-w-shell">
      <GroupsSidebar
        selected="your"
        onSelect={() => navigate("/groups")}
        groups={mine}
        onCreate={() => navigate("/groups")}
      />
      <main className="min-w-0 flex-1 px-4 py-4">{children}</main>
    </div>
  );

  if (loading) {
    return shell(<p className="py-6 text-sm text-ink-muted">Loading group…</p>);
  }

  if (missing || !group) {
    return shell(
      <Card className="grid place-items-center gap-2 px-gutter py-12 text-center">
        <Icon name="close" size={26} className="text-ink-faint" />
        <p className="text-[0.95rem] font-semibold text-ink">This group is not available</p>
        <p className="text-sm text-ink-muted">It may have been deleted.</p>
        <button
          onClick={() => navigate("/groups")}
          className="mt-2 rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Back to groups
        </button>
      </Card>,
    );
  }

  const isAdmin = group.viewerRole === "admin";
  const waiting = group.viewerStatus === "requested";

  const confirmCopy = {
    leave: {
      title: "Leave group?",
      message: `You will stop seeing posts from ${group.name}.${
        group.privacy === "private"
          ? " It is private, so coming back needs an invitation or an approved request."
          : " You can join again later."
      }`,
      label: "Leave",
    },
    delete: {
      title: "Delete group?",
      message: `${group.name}, every membership and every post in it will be removed. This cannot be undone.`,
      label: "Delete",
    },
    remove: {
      title: "Remove member?",
      message:
        confirming?.kind === "remove"
          ? `${confirming.member.user.name ?? "This person"} will be removed from ${group.name}.`
          : "",
      label: "Remove",
    },
    promote: {
      title: "Make admin?",
      message:
        confirming?.kind === "promote"
          ? `${confirming.member.user.name ?? "They"} will be able to edit ${group.name}, answer join requests, remove members and delete the group.`
          : "",
      label: "Make admin",
    },
    demote: {
      title: "Remove as admin?",
      message:
        confirming?.kind === "demote"
          ? `${confirming.member.user.name ?? "They"} will stay in ${group.name} as an ordinary member.`
          : "",
      label: "Remove as admin",
    },
  };

  /**
   * What an admin may do to someone. Nothing to the creator, who can be
   * neither removed nor demoted, and nothing to yourself — leaving is how you
   * take yourself out.
   */
  const optionsFor = (member: ApiGroupMember): MemberOption[] => {
    if (!isAdmin) return [];
    if (member.user.id === group.createdBy?.id || member.user.id === account?.id) return [];

    return [
      member.role === "admin"
        ? {
            label: "Remove as admin",
            icon: "close",
            onSelect: () => setConfirming({ kind: "demote", member }),
          }
        : {
            label: "Make admin",
            icon: "verified",
            onSelect: () => setConfirming({ kind: "promote", member }),
          },
      {
        label: "Remove from group",
        icon: "close",
        danger: true,
        onSelect: () => setConfirming({ kind: "remove", member }),
      },
    ];
  };

  /** Join, ask to join, or take back the request — whichever is open to you. */
  const joinButton = waiting ? (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 rounded-control bg-surface-raised px-4 py-2 text-sm font-semibold text-ink-muted">
        <Icon name="clock" size={12} />
        Requested
      </span>
      <button
        onClick={cancelRequest}
        disabled={busy}
        className="rounded-control bg-surface-raised px-4 py-2 text-sm font-semibold text-ink hover:bg-line disabled:opacity-60"
      >
        Cancel
      </button>
    </div>
  ) : (
    <button
      onClick={join}
      disabled={busy}
      className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
    >
      {busy ? "Working..." : joinLabel(group)}
    </button>
  );

  /** Nobody already here should show up in the invite picker. */
  const alreadyHere = [
    ...members.map((row) => row.user.id),
    ...invited.map((row) => row.user.id),
  ];

  return (
    <div className="mx-auto flex w-full max-w-shell">
      <GroupsSidebar
        selected="your"
        onSelect={() => navigate("/groups")}
        groups={mine}
        onCreate={() => navigate("/groups")}
      />

      <main className="min-w-0 flex-1 px-4 py-4">
        <Card className="overflow-hidden">
          <img
            src={groupCover(group, 1200, 400)}
            alt={group.name}
            className="aspect-[3/1] w-full bg-surface-raised object-cover"
          />

          <div className="flex flex-wrap items-end justify-between gap-3 px-gutter py-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-ink">{group.name}</h1>
              <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                <Icon name={group.privacy === "private" ? "lock" : "globe"} size={11} />
                {describePrivacy(group.privacy)} · {formatCount(group.memberCount)} member
                {group.memberCount === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {group.isMember ? (
                <>
                  <button
                    onClick={() => setInviting(true)}
                    className="flex items-center gap-2 rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                  >
                    <Icon name="user-plus" size={12} />
                    Invite
                  </button>
                  <button
                    onClick={() => setConfirming({ kind: "leave" })}
                    className="rounded-control bg-surface-raised px-4 py-2 text-sm font-semibold text-ink hover:bg-line"
                  >
                    Leave group
                  </button>
                </>
              ) : (
                joinButton
              )}

              {isAdmin && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 rounded-control bg-surface-raised px-4 py-2 text-sm font-semibold text-ink hover:bg-line"
                  >
                    <Icon name="edit" size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirming({ kind: "delete" })}
                    className="rounded-control bg-surface-raised px-4 py-2 text-sm font-semibold text-alert hover:bg-line"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {group.description && (
            <p className="px-gutter pb-3 text-sm text-ink-muted">{group.description}</p>
          )}

          {group.canRead && (
            <nav className="flex gap-1 border-t border-line px-gutter">
              {(["discussion", "members"] as Tab[]).map((name) => (
                <button
                  key={name}
                  onClick={() => setTab(name)}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold capitalize",
                    tab === name
                      ? "border-brand text-brand"
                      : "border-transparent text-ink-muted hover:bg-surface-hover",
                  )}
                >
                  {name === "members" ? `Members (${group.memberCount})` : "Discussion"}
                  {name === "members" && requests.length > 0 && (
                    <span className="rounded-pill bg-alert px-1.5 text-xs text-white">
                      {requests.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          )}
        </Card>

        {error && <Card className="mt-4 px-gutter py-3 text-sm text-alert">{error}</Card>}

        {notice && (
          <Card className="mt-4 flex items-center gap-2 px-gutter py-3 text-sm text-ink-muted">
            <Icon name="clock" size={13} className="text-brand" />
            {notice}
          </Card>
        )}

        {!group.canRead ? (
          <Card className="mt-4 grid place-items-center gap-2 px-gutter py-12 text-center">
            <Icon name="lock" size={26} className="text-ink-faint" />
            <p className="text-[0.95rem] font-semibold text-ink">This group is private</p>
            <p className="max-w-prose text-sm text-ink-muted">
              {waiting
                ? "Your request is with the admins. The posts and the member list open up once one of them lets you in."
                : "Only members can see who is in it and what is posted. Ask to join, or get an invitation from someone inside."}
            </p>
            <div className="mt-2">{joinButton}</div>
          </Card>
        ) : tab === "discussion" ? (
          <div className="mt-4 flex max-w-feed flex-col gap-4">
            {group.isMember ? (
              <Composer
                groupId={group.id}
                prompt={`Write something in ${group.name}...`}
                audience={{
                  label: group.name,
                  icon: group.privacy === "private" ? "lock" : "users-group",
                }}

              />
            ) : (
              <Card className="flex flex-wrap items-center justify-between gap-3 px-gutter py-3">
                <p className="text-sm text-ink-muted">Join this group to post in it.</p>
                {joinButton}
              </Card>
            )}

            {posts.length === 0 ? (
              <Card className="grid place-items-center gap-2 px-gutter py-10 text-center">
                <Icon name="image" size={26} className="text-ink-faint" />
                <p className="text-[0.95rem] font-semibold text-ink">No posts yet</p>
                <p className="text-sm text-ink-muted">
                  {group.isMember
                    ? "Be the first to post in this group."
                    : "Nothing has been shared here yet."}
                </p>
              </Card>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={toFeedPost(post)}
                  onDeleted={(deleted) =>
                    setPosts((current) => current.filter((item) => item.id !== deleted))
                  }
                />
              ))
            )}
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {isAdmin && requests.length > 0 && (
              <Card className="p-2">
                <h2 className="px-2 pt-1 pb-2 text-[0.95rem] font-semibold text-ink">
                  Requests to join ({requests.length})
                </h2>
                <ul className="flex flex-col gap-1">
                  {requests.map((row) => (
                    <MemberRow
                      key={row.id}
                      member={row}
                      isCreator={false}
                      actions={
                        <div className="flex gap-2">
                          <button
                            onClick={() => answerRequest(row, true)}
                            disabled={busy}
                            className="rounded-control bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => answerRequest(row, false)}
                            disabled={busy}
                            className="rounded-control bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink hover:bg-line disabled:opacity-60"
                          >
                            Decline
                          </button>
                        </div>
                      }
                    />
                  ))}
                </ul>
              </Card>
            )}

            {group.isMember && invited.length > 0 && (
              <Card className="p-2">
                <h2 className="px-2 pt-1 pb-2 text-[0.95rem] font-semibold text-ink">
                  Invited ({invited.length})
                </h2>
                <ul className="flex flex-col gap-1">
                  {invited.map((row) => (
                    <MemberRow
                      key={row.id}
                      member={row}
                      isCreator={false}
                      actions={
                        <button
                          onClick={() => withdrawInvite(row)}
                          disabled={busy}
                          className="rounded-control bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink hover:bg-line disabled:opacity-60"
                        >
                          Withdraw
                        </button>
                      }
                    />
                  ))}
                </ul>
              </Card>
            )}

            <Card className="p-2">
              <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-1 pb-2">
                <h2 className="text-[0.95rem] font-semibold text-ink">
                  Members ({members.length})
                </h2>
                {group.isMember && (
                  <button
                    onClick={() => setInviting(true)}
                    className="flex items-center gap-2 rounded-control bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand/25"
                  >
                    <Icon name="user-plus" size={12} />
                    Add people
                  </button>
                )}
              </div>

              <ul className="flex flex-col gap-1">
                {members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isCreator={member.user.id === group.createdBy?.id}
                    actions={
                      <MemberOptions
                        label={`Options for ${member.user.name ?? "this member"}`}
                        items={optionsFor(member)}
                      />
                    }
                  />
                ))}
              </ul>
            </Card>
          </div>
        )}
      </main>

      {editing && (
        <GroupFormModal
          group={group}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setGroup(saved);
            loadRail();
          }}
        />
      )}

      {inviting && (
        <InvitePeopleModal
          groupId={group.id}
          groupName={group.name}
          isPrivate={group.privacy === "private"}
          excludeIds={alreadyHere}
          onClose={() => setInviting(false)}
          onInvited={({ invited: sent, approved, awaitingAdmin }) => {
            const parts = [
              sent.length > 0 && `Invitation${sent.length === 1 ? "" : "s"} sent.`,
              approved.length > 0 && "Anyone who had already asked to join is now in.",
              awaitingAdmin.length > 0 &&
                `${awaitingAdmin.length} had already asked to join — an admin needs to approve them.`,
            ].filter(Boolean);
            setNotice(parts.join(" "));
            load();
          }}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title={confirmCopy[confirming.kind].title}
          message={confirmCopy[confirming.kind].message}
          confirmLabel={busy ? "Working..." : confirmCopy[confirming.kind].label}
          pending={busy}
          onConfirm={act}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
