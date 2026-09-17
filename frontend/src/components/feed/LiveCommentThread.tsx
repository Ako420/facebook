import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { currentUser } from "../../data";
import { formatRelativeTime } from "../../lib/format";
import { toApiFailure } from "../../lib/api";
import { Icon } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useAuth } from "../../features/auth/AuthContext";
import {
  createComment,
  deleteComment,
  listComments,
} from "../../features/posts/engagementApi";
import type { ApiComment } from "../../features/posts/engagementApi";
import { useRealtimeEvent, useRealtimeTopic } from "../../features/realtime/RealtimeProvider";
import { avatar } from "../../data";

/** Stable stand-in face for an account with no photo of its own. */
const seedFrom = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 997;
  return hash;
};

const faceFor = (author: ApiComment["author"]) =>
  author.avatarUrl || avatar(seedFrom(author.id));

function CommentRow({
  comment,
  canDelete,
  onDelete,
}: {
  comment: ApiComment;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const navigate = useNavigate();

  return (
    <li className="group flex gap-2">
      <Avatar
        src={faceFor(comment.author)}
        alt={comment.author.name ?? "Author"}
        size={32}
        onClick={() => navigate(`/profile/${comment.author.id}`)}
      />
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-full rounded-2xl bg-surface-raised px-3 py-2">
          <p className="text-[0.8rem] font-semibold text-ink">
            {comment.author.name ?? "Unknown"}
          </p>
          <p className="text-[0.9rem] break-words text-ink">{comment.content}</p>
        </div>

        <div className="flex items-center gap-3 px-3 pt-1 text-xs text-ink-muted">
          <span>{formatRelativeTime(comment.createdAt)}</span>
          {canDelete && (
            <button
              onClick={onDelete}
              className="font-semibold hover:text-alert hover:underline"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Comments for a post that lives on the server. Loads on mount — the parent
 * only renders this once the thread is opened, so nothing is fetched for a
 * post nobody expanded.
 */
export function LiveCommentThread({
  postId,
  onCountChange,
}: {
  postId: string;
  onCountChange: (delta: number) => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<ApiComment | null>(null);
  const [removing, setRemoving] = useState(false);
  const known = useRef(new Set<string>());

  useRealtimeTopic(`post:${postId}`);

  useEffect(() => {
    let active = true;

    listComments(postId)
      .then((fetched) => {
        if (!active) return;
        known.current = new Set(fetched.map((comment) => comment.id));
        setComments(fetched);
      })
      .catch((caught) => active && setError(toApiFailure(caught).message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [postId]);

  const addComment = (comment: ApiComment) => {
    if (known.current.has(comment.id)) return;
    known.current.add(comment.id);
    setComments((current) => [...current, comment]);
    onCountChange(1);
  };

  const removeComment = (id: string) => {
    if (!known.current.delete(id)) return;
    setComments((current) => current.filter((comment) => comment.id !== id));
    onCountChange(-1);
  };

  useRealtimeEvent("comment:new", ({ postId: target, comment }) => {
    if (target === postId && !loading) addComment(comment);
  });

  useRealtimeEvent("comment:deleted", ({ postId: target, commentId }) => {
    if (target === postId && !loading) removeComment(commentId);
  });

  useRealtimeEvent("ready", () => {
    if (loading) return;

    listComments(postId)
      .then((fetched) => {
        const delta = fetched.length - known.current.size;
        known.current = new Set(fetched.map((comment) => comment.id));
        setComments(fetched);
        if (delta !== 0) onCountChange(delta);
      })
      .catch(() => undefined);
  });

  const submit = async () => {
    const text = draft.trim();
    if (!text || pending) return;

    setPending(true);
    setError("");
    try {
      const created = await createComment(postId, text);
      addComment(created);
      setDraft("");
    } catch (caught) {
      const failure = toApiFailure(caught);
      setError(failure.errors.commentText || failure.message);
    } finally {
      setPending(false);
    }
  };

  const remove = async () => {
    if (!confirming) return;

    const id = confirming.id;
    const snapshot = comments;
    setRemoving(true);

    try {
      await deleteComment(id);
      removeComment(id);
      setConfirming(null);
    } catch (caught) {
      setComments(snapshot);
      setError(toApiFailure(caught).message);
      setConfirming(null);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 px-gutter pb-3">
      <div className="flex items-center gap-2">
        <Avatar
          src={user?.avatarUrl || currentUser.avatar}
          alt={user?.name ?? "You"}
          size={32}
        />
        <div className="flex flex-1 items-center gap-2 rounded-pill bg-surface-raised px-3 py-2">
          <input
            value={draft}
            disabled={pending}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            placeholder="Write a comment..."
            className="flex-1 bg-transparent text-sm text-ink outline-none disabled:opacity-60"
          />
          <button
            onClick={submit}
            disabled={pending || !draft.trim()}
            aria-label="Post comment"
            className="text-ink-muted hover:text-brand disabled:opacity-40"
          >
            <Icon name="send" size={15} />
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="px-2 text-xs text-alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="px-2 text-xs text-ink-muted">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="px-2 text-xs text-ink-muted">
          No comments yet. Be the first to say something.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              canDelete={Boolean(user && comment.author.id === user.id)}
              onDelete={() => setConfirming(comment)}
            />
          ))}
        </ul>
      )}

      {confirming && (
        <ConfirmDialog
          title="Delete comment?"
          message="This removes your comment for everyone. It cannot be undone."
          confirmLabel={removing ? "Deleting..." : "Delete"}
          pending={removing}
          onConfirm={remove}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
