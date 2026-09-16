import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons/Icon";
import { cn } from "../../lib/cn";
import { toApiFailure } from "../../lib/api";
import { uploadMedia } from "../../features/posts/postApi";
import { createStory, STORY_BACKGROUNDS } from "../../features/stories/storyApi";
import type { ApiStory } from "../../features/stories/storyApi";

const MAX_TEXT = 250;
const MAX_VIDEO_MB = 100;
const MAX_IMAGE_MB = 10;

const describeSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.max(1, Math.round(bytes / 1024))}KB`;

function reject(file: File): string | null {
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");

  if (!isVideo && !isImage) return `${file.name} is not an image or video.`;
  if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024)
    return `${file.name} is ${describeSize(file.size)} — videos must be under ${MAX_VIDEO_MB}MB.`;
  if (isImage && file.size > MAX_IMAGE_MB * 1024 * 1024)
    return `${file.name} is ${describeSize(file.size)} — images must be under ${MAX_IMAGE_MB}MB.`;

  return null;
}

/**
 * Two kinds of story from one screen: pick a file and it becomes a photo or
 * video story, type without one and it becomes words on a colour.
 */
export function CreateStoryModal({
  onClose,
  onPosted,
}: {
  onClose: () => void;
  onPosted: (story: ApiStory) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [background, setBackground] = useState(STORY_BACKGROUNDS[0]);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  const pick = (list: FileList | null) => {
    const chosen = list?.[0];
    if (!chosen) return;

    const bad = reject(chosen);
    if (bad) {
      setError(bad);
      return;
    }

    setError("");
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  };

  const clear = () => {
    setFile(null);
    setPreview(null);
    setError("");
  };

  const isVideo = file?.type.startsWith("video/");
  const canPost = Boolean(file) || text.trim().length > 0;

  const submit = async () => {
    if (!canPost || pending) return;

    setPending(true);
    setError("");
    setProgress(0);

    try {
      const media = file ? (await uploadMedia([file], setProgress))[0] : undefined;

      const story = await createStory({
        ...(media ? { media } : {}),
        ...(text.trim() ? { text: text.trim() } : {}),
        ...(!media ? { background } : {}),
      });

      onPosted(story);
      onClose();
    } catch (caught) {
      const failure = toApiFailure(caught);
      setError(failure.errors.media || failure.errors.text || failure.message);
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
        aria-label="Create a story"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-[26rem] flex-col overflow-hidden rounded-card bg-surface shadow-card"
      >
        <header className="relative border-b border-line px-gutter py-3">
          <h2 className="text-center text-lg font-bold text-ink">Create a story</h2>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-gutter py-3">
          <div
            style={file ? undefined : { background }}
            className="relative grid aspect-[9/16] max-h-[22rem] w-full place-items-center overflow-hidden rounded-media bg-surface-raised"
          >
            {preview && isVideo && (
              <video src={preview} controls className="size-full bg-black object-contain" />
            )}
            {preview && !isVideo && (
              <img src={preview} alt="" className="size-full object-contain" />
            )}

            {!file && (
              <p className="px-6 text-center text-xl leading-snug font-semibold break-words text-white">
                {text.trim() || "Say something"}
              </p>
            )}

            {file && (
              <button
                type="button"
                aria-label="Remove file"
                disabled={pending}
                onClick={clear}
                className="absolute top-2 right-2 grid size-8 place-items-center rounded-pill bg-black/65 text-white hover:bg-black/85 disabled:opacity-50"
              >
                <Icon name="close" size={13} />
              </button>
            )}
          </div>

          <textarea
            rows={2}
            value={text}
            maxLength={MAX_TEXT}
            onChange={(event) => setText(event.target.value)}
            placeholder={file ? "Add a caption..." : "What's on your mind?"}
            className="mt-3 w-full resize-none rounded-media bg-surface-raised px-3 py-2 text-[0.95rem] text-ink outline-none placeholder:text-ink-faint focus:shadow-focus"
          />
          <p className="pt-1 text-right text-xs text-ink-faint">
            {text.length}/{MAX_TEXT}
          </p>

          {!file && (
            <div className="pt-2">
              <p className="pb-1.5 text-xs font-semibold text-ink-muted">Background</p>
              <div className="flex flex-wrap gap-2">
                {STORY_BACKGROUNDS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-label="Background"
                    aria-pressed={background === option}
                    onClick={() => setBackground(option)}
                    style={{ background: option }}
                    className={cn(
                      "size-9 rounded-pill",
                      background === option
                        ? "ring-2 ring-brand ring-offset-2 ring-offset-surface"
                        : "ring-1 ring-line",
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-media bg-alert-soft px-3 py-2 text-sm text-ink">
              {error}
            </p>
          )}

          {pending && (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-pill bg-surface-raised">
                <div
                  className="h-full rounded-pill bg-brand transition-[width] duration-200"
                  style={{ width: `${file ? progress : 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">
                {file && progress < 100 ? `Uploading ${progress}%` : "Sharing…"}
              </p>
            </div>
          )}
        </div>

        <footer className="flex gap-2 border-t border-line px-gutter py-3">
          <input
            ref={fileInput}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(event) => {
              pick(event.target.files);
              event.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={pending}
            onClick={() => fileInput.current?.click()}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-control bg-surface-raised text-sm font-semibold text-ink hover:bg-line disabled:opacity-50"
          >
            <Icon name="image-solid" size={16} className="text-[#41b35d]" />
            {file ? "Change" : "Photo or video"}
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={!canPost || pending}
            className={cn(
              "h-10 flex-1 rounded-control text-sm font-semibold",
              canPost && !pending
                ? "bg-brand text-white hover:bg-brand-hover"
                : "cursor-not-allowed bg-surface-raised text-ink-faint",
            )}
          >
            {pending ? "Sharing..." : "Share story"}
          </button>
        </footer>
      </div>
    </div>
  );
}
