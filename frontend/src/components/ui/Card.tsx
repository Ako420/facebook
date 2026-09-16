import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-card bg-surface shadow-card", className)}>
      {children}
    </section>
  );
}

export function CardTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-gutter pt-3">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="rounded-control px-2 py-1 text-sm text-brand hover:bg-surface-hover"
        >
          {action}
        </button>
      )}
    </div>
  );
}
