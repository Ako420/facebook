import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "../../features/auth/AuthContext";
import { DeleteAccountDialog } from "../auth/DeleteAccountDialog";
import { cn } from "../../lib/cn";

function Row({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[0.95rem] font-medium hover:bg-surface-hover",
        danger ? "text-alert" : "text-ink",
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-pill bg-surface-raised",
          danger && "text-alert",
        )}
      >
        <Icon name={icon} size={17} />
      </span>
      {label}
    </button>
  );
}

/** The header avatar and the menu behind it: profile, sign out, deactivate. */
export function AccountMenu({ me }: { me: { id: string; name: string; avatar: string } }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // Clicking anywhere else, or pressing Escape, closes the menu.
  useEffect(() => {
    if (!open) return;

    const onDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative shrink-0">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Your account"
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative block"
      >
        <Avatar src={me.avatar} alt={me.name} size={40} />
        <span className="absolute right-0 bottom-0 grid size-4 place-items-center rounded-pill border-2 border-surface bg-surface-raised text-ink">
          <Icon name="caret" size={8} />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 rounded-card bg-surface p-2 shadow-card"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate(`/profile/${me.id}`);
            }}
            className="mb-1 flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-hover"
          >
            <Avatar src={me.avatar} alt={me.name} size={40} />
            <span className="min-w-0">
              <span className="block truncate text-[0.95rem] font-semibold text-ink">
                {me.name}
              </span>
              <span className="block text-xs text-ink-muted">See your profile</span>
            </span>
          </button>

          <hr className="my-1 border-line" />

          <Row icon="settings" label="Settings" onClick={() => setOpen(false)} />
          <Row
            icon="user-x"
            label="Deactivate account"
            danger
            onClick={() => {
              setOpen(false);
              setConfirming(true);
            }}
          />
          <Row
            icon="lock"
            label="Log out"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          />
        </div>
      )}

      {confirming && <DeleteAccountDialog onClose={() => setConfirming(false)} />}
    </div>
  );
}
