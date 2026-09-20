import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { cn } from "../../lib/cn";
import { formatCount } from "../../lib/format";
import { toApiFailure } from "../../lib/api";
import { listPosts, toReel } from "../../features/posts/postApi";
import type { Reel } from "../../lib/types";

const CARD = "relative h-56 w-32 shrink-0 overflow-hidden rounded-media";

export function ReelsRow() {
  const navigate = useNavigate();

  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    listPosts({ type: "reel", limit: 12 })
      .then((feed) => active && setReels(feed.posts.map(toReel)))
      .catch((caught) => active && setError(toApiFailure(caught).message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
      {loading &&
        [0, 1, 2, 3].map((key) => (
          <div key={key} className={cn(CARD, "animate-pulse bg-surface-raised")} />
        ))}

      {!loading &&
        reels.map((reel) => (
          <button
            key={reel.id}
            onClick={() => navigate("/reels")}
            className={CARD}
          >
            <img
              src={reel.video.poster}
              alt={reel.video.alt}
              loading="lazy"
              className="size-full bg-surface-raised object-cover"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30" />
            <Avatar
              src={reel.author.avatar}
              alt={reel.author.name}
              size={28}
              ring="muted"
              className="absolute top-2 left-2"
            />
            <span className="absolute inset-x-2 bottom-2 text-left">
              <span className="line-clamp-2 block text-[0.7rem] leading-tight font-medium text-white">
                {reel.caption || reel.author.name}
              </span>
              <span className="flex items-center gap-1 pt-1 text-[0.65rem] text-white/80">
                <Icon name="play" size={9} />
                {formatCount(reel.likeCount)}
              </span>
            </span>
          </button>
        ))}

      {!loading && !error && reels.length === 0 && (
        <div className="grid h-56 flex-1 place-items-center rounded-media bg-surface-raised px-4 text-center">
          <p className="text-sm text-ink-muted">
            No reels yet. Record one from the Reels tab.
          </p>
        </div>
      )}

      {error && (
        <div className="grid h-56 flex-1 place-items-center rounded-media bg-surface-raised px-4 text-center">
          <p className="text-sm text-alert">{error}</p>
        </div>
      )}
    </div>
  );
}
