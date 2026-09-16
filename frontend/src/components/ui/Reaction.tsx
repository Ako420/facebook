import type { ReactionType } from "../../data";
import { Icon } from "../icons/Icon";
import { cn } from "../../lib/cn";

export const REACTIONS: Record<
  ReactionType,
  { label: string; emoji: string; color: string }
> = {
  like: { label: "Like", emoji: "", color: "text-brand" },
  love: { label: "Love", emoji: "", color: "text-[#f3425f]" },
  care: { label: "Care", emoji: "\u{1F970}", color: "text-[#f7b125]" },
  haha: { label: "Haha", emoji: "\u{1F606}", color: "text-[#f7b125]" },
  wow: { label: "Wow", emoji: "\u{1F62E}", color: "text-[#f7b125]" },
  sad: { label: "Sad", emoji: "\u{1F622}", color: "text-[#f7b125]" },
  angry: { label: "Angry", emoji: "\u{1F621}", color: "text-[#e9710f]" },
};

export function ReactionChip({
  type,
  size = 18,
  className,
}: {
  type: ReactionType;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };

  if (type === "like" || type === "love")
    return (
      <span
        style={style}
        className={cn(
          "grid shrink-0 place-items-center rounded-pill text-white",
          type === "like" ? "bg-brand" : "bg-[#f3425f]",
          className,
        )}
      >
        <Icon name={type === "like" ? "thumb-solid" : "heart-solid"} size={size * 0.58} />
      </span>
    );

  return (
    <span
      style={{ ...style, fontSize: size * 0.92, lineHeight: 1 }}
      className={cn("grid shrink-0 place-items-center rounded-pill bg-canvas", className)}
    >
      {REACTIONS[type].emoji}
    </span>
  );
}
