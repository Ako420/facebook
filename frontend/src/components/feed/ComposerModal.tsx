import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { useUploads } from "../../features/uploads/UploadsProvider";
import { cn } from "../../lib/cn";
import { PostPreview } from "./PostPreview";
import type { MediaItem } from "../../lib/types";

/** MAX_FILES / MAX_VIDEO_BYTES / MAX_IMAGE_BYTES in the backend. */
const MAX_FILES = 6;
const MAX_VIDEO_MB = 100;
const MAX_IMAGE_MB = 10;

interface Draft {
  file: File;
  preview: string;
  isVideo: boolean;
}

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

export function ComposerModal({
  author,
  onClose,
  kind = "post",
  groupId,
  audience,
}: {
  author: { name: string; avatar: string };
  onClose: () => void;
  kind?: "post" | "reel";
  /** Publishes into a group you belong to instead of the main feed. */
  groupId?: string;
  /** What the line under your name reads, e.g. the group's name. */
  audience?: { label: string; icon: IconName };
}) {
  const isReel = kind === "reel";
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const { enqueue } = useUploads();

 
  useEffect(
    () => () => drafts.forEach((draft) => URL.revokeObjectURL(draft.preview)),
    [drafts],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setError("");

    const incoming = Array.from(list);
    const room = MAX_FILES - drafts.length;

    if (room <= 0) {
      setError(`You can attach at most ${MAX_FILES} files.`);
      return;
    }

    const bad = incoming.map(reject).find(Boolean);
    if (bad) {
      setError(bad);
      return;
    }

    if (incoming.length > room) {
      setError(`Only ${room} more file${room === 1 ? "" : "s"} can be added.`);
    }

    setDrafts((current) => [
      ...current,
      ...incoming.slice(0, room).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        isVideo: file.type.startsWith("video/"),
      })),
    ]);
  };

  const removeDraft = (index: number) => {
    setDrafts((current) => current.filter((_, i) => i !== index));
    setError("");
  };

  const hasContent = text.trim().length > 0 || drafts.length > 0;

  // The preview reads the files straight off the disk, so it works before
  // anything has been uploaded.
  const previewMedia: MediaItem[] = drafts.map((draft) => ({
    type: draft.isVideo ? "video" : "image",
    url: draft.preview,
    alt: draft.file.name,
    width: draft.isVideo ? 1280 : 900,
    height: draft.isVideo ? 720 : 600,
  }));

  const videoCount = drafts.filter((draft) => draft.isVideo).length;
  const canPost = isReel
    ? videoCount === 1 && drafts.length === 1
    : text.trim().length > 0 || drafts.length > 0;

  const submit = () => {
    if (!canPost) return;

    enqueue({
      kind,
      text: text.trim(),
      files: drafts.map((draft) => draft.file),
      groupId,
      audienceLabel: audience?.label,
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-100 grid place-items-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isReel ? "Create reel" : "Create post"}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-[34rem] flex-col overflow-hidden rounded-card bg-surface shadow-card"
      >
        <header className="relative border-b border-line px-gutter py-3">
          <h2 className="text-center text-lg font-bold text-ink">
            {isReel ? "Create reel" : "Create post"}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute top-2.5 right-3 grid size-9 place-items-center rounded-pill bg-surface-raised text-ink hover:bg-line disabled:opacity-50"
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        {/* Write and preview are two views of the same draft — switching
            between them never touches what has been typed or attached. */}
        <div className="flex gap-1 border-b border-line px-gutter py-2">
          {(["write", "preview"] as const).map((name) => (
            <button
              key={name}
              type="button"
              disabled={name === "preview" && !hasContent}
              onClick={() => setMode(name)}
              className={cn(
                "flex-1 rounded-control py-1.5 text-sm font-semibold capitalize",
                mode === name
                  ? "bg-brand-soft text-brand"
                  : "text-ink-muted hover:bg-surface-hover disabled:text-ink-faint disabled:hover:bg-transparent",
              )}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-gutter py-3">
          {mode === "preview" ? (
            <PostPreview
              author={author}
              text={text}
              media={previewMedia}
              audience={audience}
              kind={kind}
            />
          ) : (
            <>
          <div className="flex items-center gap-2">
            <Avatar src={author.avatar} alt={author.name} size={40} />
            <div>
              <p className="text-[0.95rem] font-semibold text-ink">{author.name}</p>
              <p className="flex items-center gap-1 text-xs text-ink-muted">
                <Icon name={audience?.icon ?? "globe"} size={10} />{" "}
                {audience?.label ?? "Public"}
              </p>
            </div>
          </div>

          <textarea
            autoFocus
            rows={3}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={isReel ? "Add a caption..." : `What's on your mind, ${author.name.split(" ")[0]}?`}
            className="mt-3 w-full resize-none bg-transparent text-lg text-ink outline-none placeholder:text-ink-faint"
          />

          {drafts.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {drafts.map((draft, index) => (
                <div
                  key={draft.preview}
                  className="relative overflow-hidden rounded-media bg-surface-raised"
                >
                  {draft.isVideo ? (
                    <video
                      src={draft.preview}
                      controls
                      preload="metadata"
                      className="aspect-video w-full bg-black object-cover"
                    />
                  ) : (
                    <img
                      src={draft.preview}
                      alt={draft.file.name}
                      className="aspect-video w-full object-cover"
                    />
                  )}

                  <button
                    type="button"
                    aria-label={`Remove ${draft.file.name}`}
                    onClick={() => removeDraft(index)}
                    className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-pill bg-black/65 text-white hover:bg-black/85 disabled:opacity-50"
                  >
                    <Icon name="close" size={12} />
                  </button>

                  <p className="truncate px-2 py-1 text-xs text-ink-muted">
                    {draft.isVideo ? "Video" : "Photo"} · {describeSize(draft.file.size)}
                  </p>
                </div>
              ))}
            </div>
          )}
            </>
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-media bg-alert-soft px-3 py-2 text-sm text-ink">
              {error}
            </p>
          )}

        </div>

        <footer className="border-t border-line px-gutter py-3">
          {/* Attaching belongs to writing, so the row steps aside in preview. */}
          {mode === "write" && (
            <div className="flex items-center justify-between rounded-media border border-line px-3 py-2">
              <span className="text-sm font-medium text-ink">
                {isReel ? "Add your video" : "Add to your post"}
              </span>
              <button
                type="button"
                aria-label="Add photo or video"
                onClick={() => fileInput.current?.click()}
                className="grid size-9 place-items-center rounded-pill hover:bg-surface-hover disabled:opacity-50"
              >
                <Icon name="image-solid" size={20} className="text-[#41b35d]" />
              </button>
            </div>
          )}

          <input
            ref={fileInput}
            type="file"
            multiple
            accept={isReel ? "video/*" : "image/*,video/*"}
            className="hidden"
            onChange={(event) => {
              addFiles(event.target.files);
              // Reset so picking the same file twice still fires onChange.
              event.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={submit}
            disabled={!canPost}
            className={cn(
              "mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-control text-[0.95rem] font-semibold transition-colors",
              canPost
                ? "bg-brand text-white hover:bg-brand-hover"
                : "cursor-not-allowed bg-surface-raised text-ink-faint",
            )}
          >
            {isReel ? "Share reel" : "Post"}
          </button>
        </footer>
      </div>
    </div>
  );
}
