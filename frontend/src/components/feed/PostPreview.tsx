import type { MediaItem } from "../../data";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { Card } from "../ui/Card";
import { PostMedia } from "./PostMedia";

/**
 * The post as the feed will render it, before it exists.

 */
export function PostPreview({
  author,
  text,
  media,
  audience,
  kind = "post",
}: {
  author: { name: string; avatar: string };
  text: string;
  media: MediaItem[];
  audience?: { label: string; icon: IconName };
  kind?: "post" | "reel";
}) {
  const empty = !text.trim() && media.length === 0;

  return (
    <div>
      <p className="pb-2 text-xs text-ink-faint">
        This is how your {kind} will look. Nothing has been shared yet.
      </p>

      <Card>
        <header className="flex items-start gap-2 px-gutter pt-3">
          <Avatar src={author.avatar} alt={author.name} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.95rem] font-semibold text-ink">{author.name}</p>
            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
              <span>now</span>
              <span>·</span>
              <Icon name={audience?.icon ?? "globe"} size={11} />
              {audience && <span className="truncate">{audience.label}</span>}
            </p>
          </div>
        </header>

        {empty ? (
          <p className="px-gutter py-6 text-center text-sm text-ink-faint">
            Write something or add a photo to see it here.
          </p>
        ) : (
          <>
            {text.trim() && (
              <p className="px-gutter py-2 text-[0.95rem] whitespace-pre-wrap text-ink">
                {text}
              </p>
            )}
            <PostMedia media={media} />
          </>
        )}

        <div className="flex items-center justify-between px-gutter py-2.5 text-sm text-ink-muted">
          <span />
          <div className="flex gap-3">
            <span>0 comments</span>
            <span>0 shares</span>
          </div>
        </div>

        <div className="mx-gutter flex items-stretch border-t border-line py-1">
          {(
            [
              { label: "Like", icon: "thumb" },
              { label: "Comment", icon: "message" },
              { label: "Share", icon: "share" },
            ] as { label: string; icon: IconName }[]
          ).map((action) => (
            <span
              key={action.label}
              className="flex flex-1 items-center justify-center gap-2 rounded-control py-1.5 text-sm font-semibold text-ink-muted"
            >
              <Icon name={action.icon} size={17} />
              {action.label}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
