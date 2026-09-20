import { useEffect, useRef, useState } from "react";
import type { Reel } from "../../lib/types";
import { formatCount, formatRelativeTime } from "../../lib/format";
import { Icon, VerifiedBadge } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EditPostModal } from "../feed/EditPostModal";
import { cn } from "../../lib/cn";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { deletePost } from "../../features/posts/postApi";
import { removeReaction, setReaction } from "../../features/posts/engagementApi";
import { LiveCommentThread } from "../feed/LiveCommentThread";
import { reportSeen } from "../../features/posts/seen";

function Action({
  name,
  label,
  count,
  active,
  onClick,
}: {
  name: IconName;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} aria-label={label} className="flex flex-col items-center gap-1">
      <span
        className={cn(
          "grid size-11 place-items-center rounded-pill bg-surface-raised text-ink hover:bg-line",
          active && "text-[#f3425f]",
        )}
      >
        <Icon name={name} size={19} />
      </span>
      {count !== undefined && (
        <span className="text-xs font-medium text-ink-muted">{formatCount(count)}</span>
      )}
    </button>
  );
}

export function ReelItem({
  reel,
  muted,
  onToggleMute,
  onDeleted,
}: {
  reel: Reel;
  muted: boolean;
  onToggleMute: () => void;
  onDeleted?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(reel.viewerLiked);
  const [likeCount, setLikeCount] = useState(reel.likeCount);
  const [commentCount, setCommentCount] = useState(reel.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(reel.caption);

  const isMine = user?.id === reel.author.id;

  const toggleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((value) => Math.max(0, value + (wasLiked ? -1 : 1)));

    try {
      const result = wasLiked
        ? await removeReaction(reel.id)
        : await setReaction(reel.id, "like");
      setLiked(result.viewerReaction !== null);
      setLikeCount(result.total);
    } catch {
      setLiked(wasLiked);
      setLikeCount(reel.likeCount);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      await deletePost(reel.id);
      onDeleted?.(reel.id);
    } catch {
      setRemoving(false);
      setConfirming(false);
    }
  };

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    let dwell: ReturnType<typeof setTimeout> | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
          dwell = setTimeout(() => reportSeen(reel.id), 1_000);
        } else {
          clearTimeout(dwell);
          element.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(element);
    return () => {
      clearTimeout(dwell);
      observer.disconnect();
    };
  }, [reel.id]);

  const togglePlay = () => {
    const element = videoRef.current;
    if (!element) return;
    if (element.paused) {
      element.play().then(() => setPlaying(true)).catch(() => undefined);
    } else {
      element.pause();
      setPlaying(false);
    }
  };

  return (
    <section className="flex h-full snap-start snap-always items-center justify-center gap-3 px-2 py-3">
      <div className="relative h-full max-w-full overflow-hidden  rounded-card bg-black shadow-card aspect-9/16">
        <video
          ref={videoRef}
          role="alertdialog"
          src={reel.video.url}
          poster={reel.video.poster}
          loop
          muted={muted}
          playsInline
          preload="metadata"
          onClick={togglePlay}
          className="size-full cursor-pointer object-cover"
        />

        {!playing && (
          <button
            onClick={togglePlay}
            aria-label="Play reel"
            className="absolute inset-0 grid place-items-center bg-black/25"
          >
            <span className="grid size-16 place-items-center rounded-pill bg-black/60 text-white">
              <Icon name="play" size={24} />
            </span>
          </button>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/85 to-transparent" />

        <button
          onClick={onToggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-pill bg-black/50 text-white hover:bg-black/70"
        >
          <Icon name={muted ? "volume-off" : "volume"} size={15} />
        </button>

        <div className="absolute inset-x-4 bottom-4 flex flex-col gap-2 text-white">
          <div className="flex items-center gap-2">
            <Avatar
              src={reel.author.avatar}
              alt={reel.author.name}
              size={36}
              onClick={() => navigate(`/profile/${reel.author.id}`)}
            />
            <span className="flex min-w-0 items-center gap-1 text-sm font-semibold">
              <span className="truncate">{reel.author.name}</span>
              {reel.author.isVerified && <VerifiedBadge size={12} />}
            </span>

          </div>

          <p className="line-clamp-2 text-sm">{caption}</p>

          <p className="text-xs text-white/80">{formatRelativeTime(reel.createdAt)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 self-end pb-4">
        <Action
          name={liked ? "heart-solid" : "heart"}
          label="Like"
          count={likeCount}
          active={liked}
          onClick={toggleLike}
        />
        <Action
          name="message"
          label="Comment"
          count={commentCount}
          onClick={() => setShowComments(true)}
        />
        {isMine && (
          <>
            <Action name="edit" label="Edit reel" onClick={() => setEditing(true)} />
            <Action name="close" label="Delete reel" onClick={() => setConfirming(true)} />
          </>
        )}
      </div>

      {editing && (
        <EditPostModal
          postId={reel.id}
          initialText={caption}
          kind="reel"
          onSaved={(updated) => setCaption(updated.title)}
          onClose={() => setEditing(false)}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title="Delete reel?"
          message="This removes the reel and its comments for everyone. It cannot be undone."
          confirmLabel={removing ? "Deleting..." : "Delete"}
          pending={removing}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        />
      )}

      {showComments && (
        <div
          className="fixed inset-0 z-100 grid place-items-end bg-black/70 sm:place-items-center"
          onClick={() => setShowComments(false)}
        >
          <div
            role="dialog"
            aria-label="Reel comments"
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[80dvh] w-full max-w-[32rem] flex-col overflow-hidden rounded-t-card bg-surface sm:rounded-card"
          >
            <header className="relative border-b border-line px-gutter py-3">
              <h2 className="text-center text-base font-bold text-ink">Comments</h2>
              <button
                aria-label="Close"
                onClick={() => setShowComments(false)}
                className="absolute top-2.5 right-3 grid size-8 place-items-center rounded-pill bg-surface-raised text-ink hover:bg-line"
              >
                <Icon name="close" size={14} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto pt-3">
              <LiveCommentThread
                postId={reel.id}
                onCountChange={(delta) =>
                  setCommentCount((value) => Math.max(0, value + delta))
                }
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
