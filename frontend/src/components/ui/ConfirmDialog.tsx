import { useEffect } from "react";
import { cn } from "../../lib/cn";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
  pending = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  return (
    <div
      className="fixed inset-0 z-100 grid place-items-center bg-black/70 p-4"
      onClick={() => !pending && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[24rem] overflow-hidden rounded-card bg-surface shadow-card"
      >
        <header className="border-b border-line px-gutter py-3">
          <h2 className="text-center text-base font-bold text-ink">{title}</h2>
        </header>

        <p className="px-gutter py-4 text-sm text-ink-muted">{message}</p>

        <footer className="flex gap-2 border-t border-line px-gutter py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="h-10 flex-1 rounded-control bg-surface-raised text-sm font-semibold text-ink hover:bg-line disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={cn(
              "flex h-10 flex-1 items-center justify-center gap-2 rounded-control text-sm font-semibold text-white disabled:opacity-60",
              danger ? "bg-alert hover:opacity-90" : "bg-brand hover:bg-brand-hover",
            )}
          >
            {pending && (
              <span
                aria-hidden
                className="size-4 animate-spin rounded-pill border-2 border-current border-t-transparent"
              />
            )}
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
