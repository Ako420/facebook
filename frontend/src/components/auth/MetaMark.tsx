import { cn } from "../../lib/cn";

/** The "∞ Meta" lockup that closes both auth screens. */
export function MetaMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-ink", className)}>
      <svg
        viewBox="0 0 30 20"
        aria-hidden
        className="h-[15px] w-[22px]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
      >
        <path d="M3 10c0-3.9 2-6.5 4.8-6.5 2.4 0 4.2 1.9 6.2 5l1.9 3c2 3.1 3.8 5 6.2 5C24.9 16.5 27 13.9 27 10s-2.1-6.5-4.9-6.5c-2.4 0-4.2 1.9-6.2 5l-1.9 3c-2 3.1-3.8 5-6.2 5C5 16.5 3 13.9 3 10Z" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight">Meta</span>
    </span>
  );
}
