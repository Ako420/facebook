import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { cn } from "../../lib/cn";

interface IconButtonProps {
  name: IconName;
  label: string;
  badge?: number;
  active?: boolean;
  size?: number;
  iconSize?: number;
  className?: string;
  onClick?: () => void;
}

export function IconButton({
  name,
  label,
  badge,
  active = false,
  size = 40,
  iconSize = 18,
  className,
  onClick,
}: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{ width: size, height: size }}
      className={cn(
        "relative grid place-items-center rounded-pill transition-colors",
        active
          ? "bg-brand-soft text-brand"
          : "bg-surface-raised text-ink hover:bg-line",
        className,
      )}
    >
      <Icon name={name} size={iconSize} />
      {Boolean(badge) && (
        <span className="absolute -top-0.5 -right-0.5 min-w-5 rounded-pill bg-alert px-1.5 text-xs font-medium text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
