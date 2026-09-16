import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { cn } from "../../lib/cn";
import { groupCover } from "../../features/groups/groupApi";
import type { ApiGroup } from "../../features/groups/groupApi";

export type GroupsView = "your" | "discover";

const views: { id: GroupsView; label: string; icon: IconName }[] = [
  { id: "your", label: "Your groups", icon: "users" },
  { id: "discover", label: "Discover", icon: "search" },
];

export function GroupsSidebar({
  selected,
  onSelect,
  groups,
  onCreate,
  invitationCount = 0,
}: {
  selected: GroupsView;
  onSelect: (view: GroupsView) => void;
  groups: ApiGroup[];
  onCreate: () => void;
  /** Badged on "Your groups", where the invitations are listed. */
  invitationCount?: number;
}) {
  const navigate = useNavigate();
  // On a group's own page the rail highlights which one you are reading.
  const { id: openGroupId } = useParams();

  return (
    <aside className="sticky top-header hidden h-[calc(100dvh-var(--spacing-header))] w-sidebar shrink-0 overflow-y-auto bg-surface px-2 py-3 shadow-card md:block">
      <div className="flex items-center justify-between px-2 pb-2">
        <h1 className="text-2xl font-bold text-ink">Groups</h1>
        <button
          aria-label="Group settings"
          className="grid size-icon place-items-center rounded-pill bg-surface-raised text-ink hover:bg-line"
        >
          <Icon name="settings" size={16} />
        </button>
      </div>

      <nav className="flex flex-col gap-0.5">
        {views.map((view) => {
          const active = selected === view.id && !openGroupId;
          return (
            <button
              key={view.id}
              onClick={() => {
                onSelect(view.id);
                if (openGroupId) navigate("/groups");
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 py-2 text-left text-[0.95rem] font-medium",
                active ? "bg-brand-soft text-brand" : "hover:bg-surface-hover",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-pill",
                  active ? "bg-brand text-white" : "bg-surface-raised text-ink",
                )}
              >
                <Icon name={view.icon} size={17} />
              </span>
              <span className="truncate">{view.label}</span>
              {view.id === "your" && invitationCount > 0 && (
                <span className="ml-auto rounded-pill bg-alert px-2 text-xs text-white">
                  {invitationCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-2 py-3">
        <button
          onClick={onCreate}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-control bg-brand-soft text-sm font-semibold text-brand hover:bg-brand/25"
        >
          <Icon name="plus" size={14} />
          Create new group
        </button>
      </div>

      <hr className="my-1 border-line" />

      <h2 className="px-2 pt-2 pb-1 text-base font-semibold text-ink-muted">
        Groups you have joined
      </h2>

      {groups.length === 0 ? (
        <p className="px-2 py-2 text-sm text-ink-faint">
          You have not joined any group yet.
        </p>
      ) : (
        <nav className="flex flex-col gap-0.5">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => navigate(`/groups/${group.id}`)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 py-2 text-left text-[0.95rem] font-medium",
                openGroupId === group.id ? "bg-brand-soft text-brand" : "hover:bg-surface-hover",
              )}
            >
              <img
                src={groupCover(group, 80, 80)}
                alt=""
                loading="lazy"
                className="size-9 shrink-0 rounded-media bg-surface-raised object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{group.name}</span>
                {group.viewerRole === "admin" && (
                  <span className="block truncate text-xs text-ink-faint">Admin</span>
                )}
              </span>
            </button>
          ))}
        </nav>
      )}
    </aside>
  );
}
