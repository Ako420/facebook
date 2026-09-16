import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { cn } from "../../lib/cn";

export interface MemberOption {
  label: string;
  icon: IconName;
  onSelect: () => void;
  danger?: boolean;
}

/** The "…" beside a member: whatever the viewer is allowed to do to them. */
export function MemberOptions({ label, items }: { label: string; items: MemberOption[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
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

  if (items.length === 0) return null;

  return (
    <div ref={root} className="relative">
      <button
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="grid size-9 place-items-center rounded-pill text-ink-muted hover:bg-surface-raised"
      >
        <Icon name="dots" size={15} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-20 mt-1 w-52 rounded-card bg-surface p-1 shadow-card"
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium hover:bg-surface-hover",
                item.danger ? "text-alert" : "text-ink",
              )}
            >
              <Icon name={item.icon} size={13} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
