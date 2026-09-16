import { useNavigate } from "react-router-dom";
import { Icon } from "../icons/Icon";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";
import { describePrivacy, groupCover, joinLabel } from "../../features/groups/groupApi";
import type { ApiGroup } from "../../features/groups/groupApi";

interface GroupCardProps {
  group: ApiGroup;
  /** Left out on a join card, where the label follows the group's privacy. */
  primaryLabel?: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Greys out the primary button — used while a join is in flight. */
  pending?: boolean;
}

export function GroupCard({
  group,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  pending = false,
}: GroupCardProps) {
  const navigate = useNavigate();
  const open = () => navigate(`/groups/${group.id}`);

  // A request already sent has nothing left to press.
  const waiting = group.viewerStatus === "requested";
  const label = primaryLabel ?? joinLabel(group);

  return (
    <article className="flex flex-col overflow-hidden rounded-card bg-surface shadow-card">
      <button onClick={open} className="block w-full" aria-label={`Open ${group.name}`}>
        <img
          src={groupCover(group, 600, 340)}
          alt={group.name}
          loading="lazy"
          className="aspect-[16/9] w-full bg-surface-raised object-cover"
        />
      </button>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <button
          onClick={open}
          className="truncate text-left text-[0.95rem] font-semibold text-ink hover:underline"
        >
          {group.name}
        </button>

        <p className="flex items-center gap-1.5 truncate text-xs text-ink-faint">
          <Icon name={group.privacy === "private" ? "lock" : "globe"} size={10} />
          {describePrivacy(group.privacy)} · {formatCount(group.memberCount)} member
          {group.memberCount === 1 ? "" : "s"}
        </p>

        {group.description && (
          <p className="line-clamp-2 text-xs text-ink-muted">{group.description}</p>
        )}

        <button
          onClick={onPrimary}
          disabled={pending || waiting}
          className={cn(
            "mt-auto flex items-center justify-center gap-1.5 rounded-control py-1.5 text-sm font-semibold",
            pending || waiting
              ? "cursor-not-allowed bg-surface-raised text-ink-faint"
              : "bg-brand-soft text-brand hover:bg-brand/25",
          )}
        >
          {waiting && <Icon name="clock" size={11} />}
          {pending ? "Working..." : label}
        </button>

        {secondaryLabel && (
          <button
            onClick={onSecondary}
            className="rounded-control bg-surface-raised py-1.5 text-sm font-semibold text-ink hover:bg-line"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </article>
  );
}
