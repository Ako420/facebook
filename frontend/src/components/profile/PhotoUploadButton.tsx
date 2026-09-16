import { useRef, useState } from "react";
import { Icon } from "../icons/Icon";
import { useAuth } from "../../features/auth/AuthContext";
import { uploadMedia } from "../../features/posts/postApi";
import { toApiFailure } from "../../lib/api";
import { cn } from "../../lib/cn";

/** MAX_IMAGE_BYTES in the backend's uploadService. */
const MAX_IMAGE_MB = 10;


export function PhotoUploadButton({
  field,
  label,
  className,
  onError,
}: {
  field: "avatarUrl" | "profileUrl";
  label: string;
  className?: string;
  onError?: (message: string) => void;
}) {
  const { updateProfile } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onError?.(`${file.name} is not an image.`);
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      onError?.(`Images must be under ${MAX_IMAGE_MB}MB.`);
      return;
    }

    setPending(true);
    try {
      const [uploaded] = await uploadMedia([file]);
      await updateProfile({ [field]: uploaded.url });
      onError?.("");
    } catch (caught) {
      const failure = toApiFailure(caught);
      onError?.(failure.errors.media || failure.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={pending}
        onClick={() => input.current?.click()}
        className={cn(
          "grid place-items-center rounded-pill bg-surface-raised text-ink shadow-card transition-colors hover:bg-line disabled:opacity-60",
          className,
        )}
      >
        {pending ? (
          <span
            aria-hidden
            className="size-4 animate-spin rounded-pill border-2 border-current border-t-transparent"
          />
        ) : (
          <Icon name="camera" size={16} />
        )}
      </button>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </>
  );
}
