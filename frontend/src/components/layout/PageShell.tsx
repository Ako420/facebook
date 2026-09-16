import type { ReactNode } from "react";
import { LeftSidebar } from "./LeftSidebar";
import { RightRail } from "./RightRail";

export function PageShell({ children, rail = true }: { children: ReactNode; rail?: boolean }) {
  return (
    <div className="mx-auto flex w-full max-w-shell gap-4">
      <LeftSidebar />
      <main className="min-w-0 flex-1 px-2 py-4 sm:px-4">{children}</main>
      {rail && <RightRail />}
    </div>
  );
}
