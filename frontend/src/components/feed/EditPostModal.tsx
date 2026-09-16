import { useEffect, useState } from "react";
import { Icon } from "../icons/Icon";
import { updatePost } from "../../features/posts/postApi";
import type { ApiPost } from "../../features/posts/postApi";
import { toApiFailure } from "../../lib/api";
import { cn } from "../../lib/cn";

/**
 * Edits the caption of a post or a reel. The API updates text only, so the
 * media stays as it was.
 */
export function EditPostModal({
  postId,
  initialText,
  kind = "post",
  onSaved,
  onClose,
}: {
  postId: string;
  initialText: string;
  kind?: "post" | "reel";
  onSaved: (post: ApiPost) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  const changed = text.trim() !== initialText.trim();

  const save = async () => {
    if (pending || !changed) return;

    setError("");
    setPending(true);
    try {
      const updated = await updatePost(postId, { title: text.trim() });
      onSaved(updated);
      onClose();
    } catch (caught) {
      const failure = toApiFailure(caught);
      setError(failure.errors.title || failure.message);
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 grid place-items-center bg-black/70 p-4"
      onClick={() => !pending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={kind === "reel" ? "Edit reel" : "Edit post"}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[32rem] overflow-hidden rounded-card bg-surface shadow-card"
      >
        <header className="relative border-b border-line px-gutter py-3">
          <h2 className="text-center text-lg font-bold text-ink">
            {kind === "reel" ? "Edit reel" : "Edit post"}
          </h2>
          <button
            type="button"
            aria-label="Close"
            disabled={pending}
            onClick={onClose}
            className="absolute top-2.5 right-3 grid size-9 place-items-center rounded-pill bg-surface-raised text-ink hover:bg-line disabled:opacity-50"
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="px-gutter py-4">
          <textarea
            autoFocus
            rows={4}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={kind === "reel" ? "Add a caption..." : "What's on your mind?"}
            className={cn(
              "w-full resize-none rounded-[10px] border bg-surface-raised px-3 py-2 text-[0.95rem] text-ink outline-none placeholder:text-ink-faint",
              error ? "border-alert" : "border-line focus:border-brand",
            )}
          />

          {error && (
            <p role="alert" className="mt-1 text-xs text-alert">
              {error}
            </p>
          )}

          <p className="mt-2 text-xs text-ink-faint">
            Photos and videos cannot be changed after posting.
          </p>
        </div>

        <footer className="flex gap-2 border-t border-line px-gutter py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-10 flex-1 rounded-control bg-surface-raised text-sm font-semibold text-ink hover:bg-line disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !changed}
            className={cn(
              "flex h-10 flex-1 items-center justify-center gap-2 rounded-control text-sm font-semibold",
              changed && !pending
                ? "bg-brand text-white hover:bg-brand-hover"
                : "cursor-not-allowed bg-surface-raised text-ink-faint",
            )}
          >
            {pending && (
              <span
                aria-hidden
                className="size-4 animate-spin rounded-pill border-2 border-current border-t-transparent"
              />
            )}
            {pending ? "Saving..." : "Save"}
          </button>
        </footer>
      </div>
    </div>
  );
}
