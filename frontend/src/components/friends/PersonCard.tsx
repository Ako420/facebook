import type { User } from "../../lib/types";
import { formatRelativeTime } from "../../lib/format";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/cn";

interface PersonCardProps {
  user: User;
  caption?: string;
  primaryLabel: string;
  secondaryLabel: string;
  done?: boolean;
  doneLabel?: string;
  onPrimary: () => void;
  onSecondary: () => void;
}

export function PersonCard({
  user,
  caption,
  primaryLabel,
  secondaryLabel,
  done = false,
  doneLabel = "Request sent",
  onPrimary,
  onSecondary,
}: PersonCardProps) {
  const navigate = useNavigate();
  return (
    <article className="overflow-hidden rounded-card bg-surface shadow-card">
      <button onClick={() => navigate(`/profile/${user.id}`)} className="block w-full">
        <img
          src={user.avatar}
          alt={user.name}
          loading="lazy"
          className="aspect-square w-full bg-surface-raised object-cover"
        />
      </button>

      <div className="flex flex-col gap-1 p-3">
        <button
          onClick={() => navigate(`/profile/${user.id}`)}
          className="truncate text-left text-[0.95rem] font-semibold text-ink hover:underline"
        >
          {user.name}
        </button>
        <p className="truncate text-xs text-ink-faint">
          {caption ??
            (user.mutualFriendCount > 0
              ? `${user.mutualFriendCount} mutual friends`
              : user.work || user.location)}
        </p>

        <button
          onClick={onPrimary}
          disabled={done}
          className={cn(
            "mt-2 rounded-control py-1.5 text-sm font-semibold",
            done
              ? "bg-surface-raised text-ink-faint"
              : "bg-brand-soft text-brand hover:bg-brand/25",
          )}
        >
          {done ? doneLabel : primaryLabel}
        </button>
        <button
          onClick={onSecondary}
          className="rounded-control bg-surface-raised py-1.5 text-sm font-semibold text-ink hover:bg-line"
        >
          {secondaryLabel}
        </button>
      </div>
    </article>
  );
}

export function RequestCard({
  user,
  sentAt,
  mutual,
  onConfirm,
  onDelete,
  confirmed,
}: {
  user: User;
  sentAt: string;
  mutual: number;
  confirmed: boolean;
  onConfirm: () => void;
  onDelete: () => void;
}) {
  return (
    <PersonCard
      user={user}
      caption={`${mutual} mutual friends · ${formatRelativeTime(sentAt)}`}
      primaryLabel="Confirm"
      secondaryLabel="Delete"
      done={confirmed}
      doneLabel="Friends"
      onPrimary={onConfirm}
      onSecondary={onDelete}
    />
  );
}
