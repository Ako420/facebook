import { useEffect, useRef, useState } from "react";
import { avatarOf } from "../lib/images";
import { useAuth } from "../features/auth/AuthContext";
import { listPosts, toReel } from "../features/posts/postApi";
import type { ApiPost } from "../features/posts/postApi";
import { ComposerModal } from "../components/feed/ComposerModal";
import { usePublishedPosts } from "../features/uploads/UploadsProvider";
import { ReelItem } from "../components/reels/ReelItem";
import { Icon } from "../components/icons/Icon";
import type { IconName } from "../components/icons/Icon";
import { Avatar } from "../components/ui/Avatar";
import { cn } from "../lib/cn";
import { useNavigate } from "react-router-dom";

const tabs: { id: string; label: string; icon: IconName }[] = [
  { id: "for-you", label: "For you", icon: "reels" },
];

export default function ReelsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [tab, setTab] = useState("for-you");
  const [mine, setMine] = useState<ApiPost[]>([]);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    listPosts({ type: "reel" })
      .then((feed) => setMine(feed.posts))
      .catch(() => setMine([]));
  }, []);

  usePublishedPosts((post) => {
    if (post.type !== "reel") return;
    setMine((current) => [post, ...current]);
  });

  const author = {
    name: user?.name ?? "You",
    avatar: avatarOf(user?.avatarUrl),
  };

  const list = mine.map(toReel);

  const step = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({ top: direction * scroller.clientHeight, behavior: "smooth" });
  };

  return (
    <div className="relative h-[calc(100dvh-var(--spacing-header))] overflow-hidden">
      <nav className="absolute top-4 left-4 z-20 hidden w-44 flex-col gap-1 md:flex">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2 text-left text-[0.95rem] font-medium",
              tab === item.id ? "bg-brand-soft text-brand" : "hover:bg-surface-hover",
            )}
          >
            <span className="grid size-9 place-items-center rounded-pill bg-surface-raised">
              <Icon name={item.icon} size={17} />
            </span>
            {item.label}
          </button>
        ))}
        <button
          onClick={() => navigate(user ? `/profile/${user.id}` : "/profile")}
          className="flex items-center gap-3 rounded-lg px-2 py-2 text-left text-[0.95rem] font-medium hover:bg-surface-hover"
        >
          <Avatar src={author.avatar} alt={author.name} size={36} />
          Profile
        </button>

        <button
          onClick={() => setComposing(true)}
          className="mt-2 flex items-center gap-3 rounded-lg px-2 py-2 text-left text-[0.95rem] font-medium text-brand hover:bg-surface-hover"
        >
          <span className="grid size-9 place-items-center rounded-pill bg-brand-soft">
            <Icon name="plus" size={17} />
          </span>
          Create reel
        </button>
      </nav>

      <div
        ref={scrollerRef}
        className="h-full snap-y snap-mandatory overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:hidden"
      >
        {list.length === 0 && (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <Icon name="reels" size={30} className="text-ink-faint" />
              <p className="pt-2 text-[0.95rem] font-semibold text-ink">No reels yet</p>
              <p className="text-sm text-ink-muted">Share a video to start the feed.</p>
            </div>
          </div>
        )}

        {list.map((reel) => (
          <div key={reel.id} className="h-full">
            <ReelItem
              reel={reel}
              muted={muted}
              onToggleMute={() => setMuted((value) => !value)}
              onDeleted={(id) => setMine((current) => current.filter((item) => item.id !== id))}
            />
          </div>
        ))}
      </div>

      <div className="absolute right-4 bottom-1/2 z-20 hidden translate-y-1/2 flex-col gap-3 md:flex">
        <button
          onClick={() => step(-1)}
          aria-label="Previous reel"
          className="grid size-10 place-items-center rounded-pill bg-surface-raised text-ink hover:bg-line"
        >
          <Icon name="chevron-up" size={16} />
        </button>
        <button
          onClick={() => step(1)}
          aria-label="Next reel"
          className="grid size-10 place-items-center rounded-pill bg-surface-raised text-ink hover:bg-line"
        >
          <Icon name="chevron-down" size={16} />
        </button>
      </div>

      {composing && (
        <ComposerModal
          kind="reel"
          author={author}
          onClose={() => setComposing(false)}
        />
      )}
    </div>
  );
}
