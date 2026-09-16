import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../ui/Avatar";
import { Icon } from "../icons/Icon";
import { formatRelativeTime } from "../../lib/format";
import { toPerson } from "../../features/friends/friendApi";
import type { ApiGroupMember } from "../../features/groups/groupApi";

/** What the second line says, which depends on why the row exists. */
const caption = (member: ApiGroupMember, isCreator: boolean) => {
  const when = formatRelativeTime(member.joinedAt);

  if (member.status === "requested") return `Asked to join ${when}`;
  if (member.status === "invited") {
    return member.invitedBy?.name
      ? `Invited by ${member.invitedBy.name} · ${when}`
      : `Invited ${when}`;
  }

  return `${isCreator ? "Creator · " : ""}Joined ${when}`;
};

export function MemberRow({
  member,
  isCreator,
  canRemove = false,
  onRemove,
  actions,
}: {
  member: ApiGroupMember;
  /** The creator is shown as such and can never be removed. */
  isCreator: boolean;
  canRemove?: boolean;
  onRemove?: () => void;
  /** Replaces the remove button — approve/decline on a request, say. */
  actions?: ReactNode;
}) {
  const navigate = useNavigate();
  const person = toPerson(member.user);
  const isAdmin = member.status === "active" && member.role === "admin";

  return (
    <li className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-hover">
      <Avatar
        src={person.avatar}
        alt={person.name}
        size={44}
        onClick={() => navigate(`/profile/${member.user.id}`)}
      />

      <div className="min-w-0 flex-1">
        <button
          onClick={() => navigate(`/profile/${member.user.id}`)}
          className="block max-w-full truncate text-left text-[0.95rem] font-semibold text-ink hover:underline"
        >
          {person.name}
        </button>
        <p className="flex items-center gap-1.5 truncate text-xs text-ink-faint">
          {isAdmin && (
            <>
              <span className="flex items-center gap-1 text-brand">
                <Icon name="verified" size={10} />
                Admin
              </span>
              <span>·</span>
            </>
          )}
          <span className="truncate">{caption(member, isCreator)}</span>
        </p>
      </div>

      {actions ??
        (canRemove && (
          <button
            onClick={onRemove}
            className="rounded-control bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink hover:bg-line"
          >
            Remove
          </button>
        ))}
    </li>
  );
}
