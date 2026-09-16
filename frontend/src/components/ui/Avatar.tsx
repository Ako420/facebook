import { cn } from "../../lib/cn";

interface AvatarProps {
  src: string;
  alt: string;
  size?: number;
  online?: boolean;
  ring?: "none" | "brand" | "muted";
  className?: string;
  onClick?: () => void;
}

export function Avatar({
  src,
  alt,
  size = 40,
  online = false,
  ring = "none",
  className,
  onClick,
}: AvatarProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn("relative shrink-0", onClick && "cursor-pointer", className)}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn(
          "size-full rounded-pill bg-surface-raised object-cover",
          ring === "brand" && "ring-2 ring-brand ring-offset-2 ring-offset-surface",
          ring === "muted" && "ring-2 ring-line ring-offset-2 ring-offset-surface",
        )}
      />
      {online && (
        <span
          className="absolute right-0 bottom-0 rounded-pill border-2 border-surface bg-online"
          style={{ width: Math.max(9, size * 0.28), height: Math.max(9, size * 0.28) }}
        />
      )}
    </Tag>
  );
}
