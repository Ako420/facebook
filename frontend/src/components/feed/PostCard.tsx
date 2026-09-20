import { useEffect, useRef, useState } from "react";
import type { Post, ReactionCounts, ReactionType } from "../../lib/types";
import { formatCount, formatRelativeTime } from "../../lib/format";
import { Icon, VerifiedBadge } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { Card } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EditPostModal } from "./EditPostModal";
import { REACTIONS, ReactionChip } from "../ui/Reaction";
import { LiveCommentThread } from "./LiveCommentThread";
import { LinkCard, PostMedia } from "./PostMedia";
import { cn } from "../../lib/cn";
import { useNavigate } from "react-router-dom";
import {
  reactionFromCode,
  removeReaction as deleteReaction,
  setReaction as putReaction,
} from "../../features/posts/engagementApi";
import { deletePost, toReactionCounts } from "../../features/posts/postApi";
import type { ApiPost } from "../../features/posts/postApi";
import { useAuth } from "../../features/auth/AuthContext";
import { useRealtimeEvent } from "../../features/realtime/RealtimeProvider";
import { useSeen } from "../../features/posts/seen";

const privacyIcon: Record<Post["privacy"], IconName> = {
  public: "globe",
  friends: "users",
  "only-me": "lock",
};

const reactionOrder: ReactionType[] = ["like", "love", "care", "haha", "wow", "sad", "angry"];

/** Moves one person's reaction from one bucket to another. */
function adjust(
  counts: ReactionCounts,
  from: ReactionType | null,
  to: ReactionType | null,
): ReactionCounts {
  const next = { ...counts };

  if (from) {
    next[from] = Math.max(0, (next[from] ?? 0) - 1);
    if (next[from] === 0) delete next[from];
  }
  if (to) next[to] = (next[to] ?? 0) + 1;

  return next;
}

const sum = (counts: ReactionCounts) =>
  Object.values(counts).reduce((running, value) => running + (value ?? 0), 0);


export function PostCard({
  post,
  onDeleted,
  onUpdated,
  initiallyShowComments = false,
}: {
  post: Post;
  onDeleted?: (id: string) => void;
  onUpdated?: (post: ApiPost) => void;
  initiallyShowComments?: boolean;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reaction, setReaction] = useState<ReactionType | null>(post.viewerReaction);
  const [counts, setCounts] = useState<ReactionCounts>(post.reactions);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(initiallyShowComments);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(post.text);
  const menuRef = useRef<HTMLDivElement>(null);
  const seenRef = useSeen(post.id);

  const isMine = user?.id === post.author.id;

  useRealtimeEvent("post:reactions", ({ postId, counts: tallies, total }) => {
    if (postId !== post.id) return;
    setCounts(toReactionCounts({ counts: tallies, total, viewerReaction: null }));
  });

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const remove = async () => {
    setRemoving(true);
    try {
      await deletePost(post.id);
      onDeleted?.(post.id);
    } catch {
      setRemoving(false);
      setConfirming(false);
    }
  };

  const total = sum(counts);
  const chips = (Object.keys(counts) as ReactionType[])
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
    .slice(0, 3);

  const active = reaction ? REACTIONS[reaction] : null;

  const react = async (next: ReactionType | null) => {
    const previousReaction = reaction;
    const previousCounts = counts;

  
    setReaction(next);
    setCounts(adjust(counts, previousReaction, next));

    try {
      const result = next
        ? await putReaction(post.id, next)
        : await deleteReaction(post.id);

      setCounts(toReactionCounts(result));
      setReaction(reactionFromCode(result.viewerReaction));
    } catch {
      setReaction(previousReaction);
      setCounts(previousCounts);
    }
  };

  return (
    <div ref={seenRef}>
      <Card>
      <header className="flex items-start gap-2 px-gutter pt-3">
        <Avatar
          src={post.author.avatar}
          alt={post.author.name}
          size={40}
          onClick={() => navigate(`/profile/${post.author.id}`)}
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[0.95rem] font-semibold text-ink">
            <button
              onClick={() => navigate(`/profile/${post.author.id}`)}
              className="truncate hover:underline"
            >
              {post.author.name}
            </button>
            {post.author.isVerified && <VerifiedBadge />}
            {post.feeling && (
              <span className="truncate font-normal text-ink">is feeling {post.feeling}</span>
            )}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <button onClick={() => navigate(`/posts/${post.id}`)} className="hover:underline">
              {formatRelativeTime(post.createdAt)}
            </button>
            <span>·</span>
            <Icon name={privacyIcon[post.privacy]} size={11} />
            {post.location && (
              <>
                <span>·</span>
                <span className="truncate">{post.location}</span>
              </>
            )}
          </p>
        </div>
        {isMine && (
          <div ref={menuRef} className="relative">
            <button
              aria-label="Post options"
              aria-haspopup="menu"
              onClick={() => setMenuOpen((value) => !value)}
              className="grid size-8 place-items-center rounded-pill text-ink-muted hover:bg-surface-hover"
            >
              <Icon name="dots" size={16} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1 w-48 rounded-card bg-surface p-1 shadow-card"
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setEditing(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-ink hover:bg-surface-hover"
                >
                  <Icon name="edit" size={14} />
                  Edit post
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirming(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-alert hover:bg-surface-hover"
                >
                  <Icon name="close" size={14} />
                  Delete post
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {text &&
        (post.background && post.media.length === 0 ? (
          <div
            style={{ background: post.background }}
            className="mt-3 grid min-h-60 place-items-center px-8 py-10 text-center text-xl font-semibold text-white"
          >
            {text}
          </div>
        ) : (
          <p className="px-gutter py-2 text-[0.95rem] whitespace-pre-wrap text-ink">
            {text}
          </p>
        ))}

      <PostMedia media={post.media} />
      {post.link && <LinkCard link={post.link} />}

      <div className="flex items-center justify-between px-gutter py-2.5 text-sm text-ink-muted">
        {total > 0 ? (
          <button className="flex items-center gap-1 hover:underline">
            <span className="flex -space-x-1">
              {chips.map((type) => (
                <ReactionChip key={type} type={type} size={18} className="ring-2 ring-surface" />
              ))}
            </span>
            <span className="pl-1">{formatCount(total)}</span>
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          <button onClick={() => setShowComments(true)} className="hover:underline">
            {formatCount(commentCount)} comments
          </button>
          <button className="hover:underline">{formatCount(post.shareCount)} shares</button>
        </div>
      </div>

      <div className="mx-gutter flex items-stretch border-t border-line py-1">
        <div
          className="relative flex-1"
          onMouseEnter={() => setPickerOpen(true)}
          onMouseLeave={() => setPickerOpen(false)}
        >
          {pickerOpen && (
            <div className="absolute bottom-full left-0 z-10 mb-2 flex gap-1 rounded-pill bg-surface-raised p-1.5 shadow-card">
              {reactionOrder.map((type) => (
                <button
                  key={type}
                  title={REACTIONS[type].label}
                  onClick={() => {
                    react(reaction === type ? null : type);
                    setPickerOpen(false);
                  }}
                  className="transition-transform hover:-translate-y-1 hover:scale-125"
                >
                  <ReactionChip type={type} size={30} />
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => react(reaction ? null : "like")}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-control py-1.5 text-sm font-semibold hover:bg-surface-hover",
              active ? active.color : "text-ink-muted",
            )}
          >
            {reaction && reaction !== "like" ? (
              <ReactionChip type={reaction} size={18} />
            ) : (
              <Icon name={reaction ? "thumb-solid" : "thumb"} size={17} />
            )}
            {active?.label ?? "Like"}
          </button>
        </div>

        <button
          onClick={() => setShowComments((value) => !value)}
          className="flex flex-1 items-center justify-center gap-2 rounded-control py-1.5 text-sm font-semibold text-ink-muted hover:bg-surface-hover"
        >
          <Icon name="message" size={17} />
          Comment
        </button>

        <button className="flex flex-1 items-center justify-center gap-2 rounded-control py-1.5 text-sm font-semibold text-ink-muted hover:bg-surface-hover">
          <Icon name="share" size={17} />
          Share
        </button>
      </div>

      {editing && (
        <EditPostModal
          postId={post.id}
          initialText={text}
          onSaved={(updated) => {
            setText(updated.title);
            onUpdated?.(updated);
          }}
          onClose={() => setEditing(false)}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title="Delete post?"
          message="This removes the post and its comments for everyone. It cannot be undone."
          confirmLabel={removing ? "Deleting..." : "Delete"}
          pending={removing}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        />
      )}

      {showComments && (
        <div className="border-t border-line pt-3 animate-slide-in-bottom">
          <LiveCommentThread
            postId={post.id}
            onCountChange={(delta) => setCommentCount((value) => Math.max(0, value + delta))}
          />
        </div>
      )}
      </Card>
    </div>
  );
}
