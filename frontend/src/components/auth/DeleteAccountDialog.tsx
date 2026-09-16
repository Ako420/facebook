import { useEffect, useState } from "react";
import { Icon } from "../icons/Icon";
import { useAuth } from "../../features/auth/AuthContext";
import { toApiFailure } from "../../lib/api";
import { cn } from "../../lib/cn";

/**
 * Confirms deactivation. The endpoint requires the account password, which
 * doubles as the confirmation step — there is no way to trigger this by a
 * stray click.
 */
export function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const { user, deactivateAccount } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  const confirm = async () => {
    if (pending) return;

    if (!password) {
      setError("Enter your password to confirm.");
      return;
    }

    setError("");
    setPending(true);
    try {
      // On success the session is dropped, which sends us back to /login.
      await deactivateAccount(password);
    } catch (caught) {
      const failure = toApiFailure(caught);
      setError(failure.errors.password || failure.message);
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 grid place-items-center bg-black/70 p-4"
      onClick={() => !pending && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="deactivate-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[26rem] overflow-hidden rounded-card bg-surface shadow-card"
      >
        <header className="relative border-b border-line px-gutter py-3">
          <h2 id="deactivate-title" className="text-center text-lg font-bold text-ink">
            Deactivate account
          </h2>
          <button
            type="button"
            aria-label="Cancel"
            disabled={pending}
            onClick={onClose}
            className="absolute top-2.5 right-3 grid size-9 place-items-center rounded-pill bg-surface-raised text-ink hover:bg-line disabled:opacity-50"
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="space-y-3 px-gutter py-4">
          <div className="flex items-start gap-3 rounded-media bg-alert-soft px-3 py-2.5">
            <Icon name="flag" size={16} className="mt-0.5 text-alert" />
            <p className="text-sm text-ink">
              You will be signed out and <strong>{user?.name}</strong> will no longer
              be able to log in. Your posts stay where they are.
            </p>
          </div>

          <p className="text-sm text-ink-muted">
            Your account is not erased — it is marked inactive and can be restored.
          </p>

          <div>
            <label
              htmlFor="deactivate-password"
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
              Confirm your password
            </label>
            <input
              id="deactivate-password"
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={pending}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && confirm()}
              placeholder="Password"
              aria-invalid={Boolean(error) || undefined}
              className={cn(
                "h-11 w-full rounded-[10px] border bg-surface-raised px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint disabled:opacity-60",
                error ? "border-alert" : "border-line focus:border-brand focus:shadow-focus",
              )}
            />
            {error && (
              <p role="alert" className="mt-1 text-xs text-alert">
                {error}
              </p>
            )}
          </div>
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
            onClick={confirm}
            disabled={pending}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-control bg-alert text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending && (
              <span
                aria-hidden
                className="size-4 animate-spin rounded-pill border-2 border-current border-t-transparent"
              />
            )}
            Deactivate
          </button>
        </footer>
      </div>
    </div>
  );
}
