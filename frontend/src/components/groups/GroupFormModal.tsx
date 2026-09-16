import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons/Icon";
import { createGroup, groupCover, updateGroup } from "../../features/groups/groupApi";
import type { ApiGroup } from "../../features/groups/groupApi";
import { uploadMedia } from "../../features/posts/postApi";
import { toApiFailure } from "../../lib/api";
import { cn } from "../../lib/cn";

/** MAX_IMAGE_BYTES in the backend. */
const MAX_IMAGE_MB = 10;
const MAX_NAME = 75;
const MAX_DESCRIPTION = 500;

const privacies = [
  {
    value: "public" as const,
    label: "Public",
    hint: "Anyone can find the group and read what is posted in it.",
  },
  {
    value: "private" as const,
    label: "Private",
    hint: "Only members can find the group or see its posts.",
  },
];

/**
 * One form for both creating a group and editing one, since the fields and the
 * rules behind them are the same. Pass `group` to edit it.
 */
export function GroupFormModal({
  group,
  onClose,
  onSaved,
}: {
  group?: ApiGroup;
  onClose: () => void;
  onSaved: (group: ApiGroup) => void;
}) {
  const editing = Boolean(group);

  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [privacy, setPrivacy] = useState<"public" | "private">(group?.privacy ?? "public");
  const [coverUrl, setCoverUrl] = useState(group?.coverUrl ?? "");
  const [preview, setPreview] = useState(group ? groupCover(group, 600, 340) : "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  const pickCover = async (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("The cover has to be an image.");
      return;
    }

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`The cover must be under ${MAX_IMAGE_MB}MB.`);
      return;
    }

    setError("");
    setUploading(true);
    // Show the local file straight away; the URL catches up when it lands.
    const local = URL.createObjectURL(file);
    setPreview(local);

    try {
      const [uploaded] = await uploadMedia([file]);
      setCoverUrl(uploaded.url);
    } catch (caught) {
      setError(toApiFailure(caught).message);
      setPreview(group ? groupCover(group, 600, 340) : "");
    } finally {
      URL.revokeObjectURL(local);
      setUploading(false);
    }
  };

  const canSave = name.trim().length >= 3 && !pending && !uploading;

  const submit = async () => {
    if (!canSave) return;

    setPending(true);
    setError("");
    setErrors({});

    const body = {
      name: name.trim(),
      description: description.trim(),
      privacy,
      ...(coverUrl ? { coverUrl } : {}),
    };

    try {
      const saved = group ? await updateGroup(group.id, body) : await createGroup(body);
      onSaved(saved);
      onClose();
    } catch (caught) {
      const failure = toApiFailure(caught);
      setErrors(failure.errors);
      // A field-level message is already shown under its input.
      if (Object.keys(failure.errors).length === 0) setError(failure.message);
    } finally {
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
        aria-label={editing ? "Edit group" : "Create group"}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-[34rem] flex-col overflow-hidden rounded-card bg-surface shadow-card"
      >
        <header className="relative border-b border-line px-gutter py-3">
          <h2 className="text-center text-lg font-bold text-ink">
            {editing ? "Edit group" : "Create group"}
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

        <div className="min-h-0 flex-1 overflow-y-auto px-gutter py-3">
          <label className="block text-sm font-medium text-ink" htmlFor="group-name">
            Group name
          </label>
          <input
            id="group-name"
            autoFocus
            value={name}
            maxLength={MAX_NAME}
            onChange={(event) => setName(event.target.value)}
            placeholder="Sunday League Cricket"
            className="mt-1 w-full rounded-media bg-surface-raised px-3 py-2 text-[0.95rem] text-ink outline-none placeholder:text-ink-faint focus:shadow-focus"
          />
          <p className="mt-1 text-xs text-ink-faint">
            {errors.name ? (
              <span className="text-alert">{errors.name}</span>
            ) : (
              `At least 3 characters · ${name.length}/${MAX_NAME}`
            )}
          </p>

          <label className="mt-3 block text-sm font-medium text-ink" htmlFor="group-description">
            Description
          </label>
          <textarea
            id="group-description"
            rows={3}
            value={description}
            maxLength={MAX_DESCRIPTION}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this group about?"
            className="mt-1 w-full resize-none rounded-media bg-surface-raised px-3 py-2 text-[0.95rem] text-ink outline-none placeholder:text-ink-faint focus:shadow-focus"
          />
          <p className="mt-1 text-xs text-ink-faint">
            {errors.description ? (
              <span className="text-alert">{errors.description}</span>
            ) : (
              `${description.length}/${MAX_DESCRIPTION}`
            )}
          </p>

          <p className="mt-3 text-sm font-medium text-ink">Privacy</p>
          <div className="mt-1 flex flex-col gap-2">
            {privacies.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPrivacy(option.value)}
                className={cn(
                  "flex items-start gap-3 rounded-media border px-3 py-2 text-left",
                  privacy === option.value
                    ? "border-brand bg-brand-soft"
                    : "border-line hover:bg-surface-hover",
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-pill bg-surface-raised text-ink">
                  <Icon name={option.value === "private" ? "lock" : "globe"} size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.95rem] font-semibold text-ink">
                    {option.label}
                  </span>
                  <span className="block text-xs text-ink-muted">{option.hint}</span>
                </span>
              </button>
            ))}
          </div>
          {errors.privacy && <p className="mt-1 text-xs text-alert">{errors.privacy}</p>}

          <p className="mt-3 text-sm font-medium text-ink">Cover photo</p>
          <div className="mt-1 overflow-hidden rounded-media border border-line">
            {preview ? (
              <img
                src={preview}
                alt="Group cover"
                className="aspect-[16/9] w-full bg-surface-raised object-cover"
              />
            ) : (
              <div className="grid aspect-[16/9] w-full place-items-center bg-surface-raised text-ink-faint">
                <Icon name="image" size={26} />
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={uploading || pending}
            onClick={() => fileInput.current?.click()}
            className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-control bg-surface-raised text-sm font-semibold text-ink hover:bg-line disabled:opacity-60"
          >
            <Icon name="camera" size={14} />
            {uploading ? "Uploading..." : preview ? "Change cover" : "Add a cover"}
          </button>

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              pickCover(event.target.files?.[0]);
              event.target.value = "";
            }}
          />

          {error && (
            <p role="alert" className="mt-3 rounded-media bg-alert-soft px-3 py-2 text-sm text-ink">
              {error}
            </p>
          )}
        </div>

        <footer className="border-t border-line px-gutter py-3">
          <button
            type="button"
            onClick={submit}
            disabled={!canSave}
            className={cn(
              "flex h-10 w-full items-center justify-center gap-2 rounded-control text-[0.95rem] font-semibold transition-colors",
              canSave
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
            {editing ? "Save changes" : "Create group"}
          </button>
        </footer>
      </div>
    </div>
  );
}
