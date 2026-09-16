import { useCallback, useEffect, useState } from "react";
import { Icon } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { CreateStoryModal } from "../stories/CreateStoryModal";
import { StoryViewer } from "../stories/StoryViewer";
import { cn } from "../../lib/cn";
import { toApiFailure } from "../../lib/api";
import { useAuth } from "../../features/auth/AuthContext";
import { toPerson } from "../../features/friends/friendApi";
import { listStories, storyPoster } from "../../features/stories/storyApi";
import type { ApiStoryGroup } from "../../features/stories/storyApi";

const CARD = "relative h-story-h w-story-w shrink-0 overflow-hidden rounded-card shadow-card";

function Skeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((key) => (
        <div key={key} className={cn(CARD, "animate-pulse bg-surface-raised")} />
      ))}
    </>
  );
}

export function StoryRail() {
  const { user } = useAuth();

  const [groups, setGroups] = useState<ApiStoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [openAt, setOpenAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setGroups(await listStories());
      setError("");
    } catch (caught) {
      setError(toApiFailure(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** The ring dims as soon as a story is watched, without waiting on a reload. */
  const markSeen = useCallback((storyId: string) => {
    setGroups((current) =>
      current.map((group) => {
        if (!group.items.some((row) => row.id === storyId)) return group;

        const items = group.items.map((row) =>
          row.id === storyId ? { ...row, seen: true } : row,
        );

        return { ...group, items, hasUnseen: items.some((row) => !row.seen) };
      }),
    );
  }, []);

  const dropStory = useCallback((storyId: string) => {
    setGroups((current) =>
      current
        .map((group) => ({
          ...group,
          items: group.items.filter((row) => row.id !== storyId),
        }))
        .filter((group) => group.items.length > 0),
    );
  }, []);

  const me = toPerson({ id: user?.id ?? "", name: user?.name, avatarUrl: user?.avatarUrl });

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setCreating(true)}
          className="relative w-story-w shrink-0 overflow-visible rounded-card bg-surface shadow-card"
        >
          <img
            src={me.avatar}
            alt={me.name}
            className="h-[9.5rem] w-full rounded-t-card bg-surface-raised object-cover"
          />
          <span className="grid h-12 place-items-end justify-center pb-2 text-xs font-medium text-ink">
            Create story
          </span>
          <span className="absolute top-[8.4rem] left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-pill border-4 border-surface bg-brand text-white">
            <Icon name="plus" size={12} />
          </span>
        </button>

        {loading && <Skeleton />}

        {!loading &&
          groups.map((group, index) => {
            const newest = group.items[group.items.length - 1];
            const poster = storyPoster(newest);
            const author = toPerson(group.author);

            return (
              <button
                key={group.author.id}
                onClick={() => setOpenAt(index)}
                aria-label={group.isViewer ? "Your story" : `${author.name}'s story`}
                className={CARD}
              >
                {poster ? (
                  <img
                    src={poster}
                    alt=""
                    loading="lazy"
                    className="size-full bg-surface-raised object-cover"
                  />
                ) : (
                  <span
                    style={{ background: newest.background ?? "#1877f2" }}
                    className="grid size-full place-items-center px-2"
                  >
                    <span className="line-clamp-4 text-center text-xs font-semibold text-white">
                      {newest.text}
                    </span>
                  </span>
                )}

                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                <Avatar
                  src={author.avatar}
                  alt={author.name}
                  size={36}
                  ring={group.hasUnseen ? "brand" : "muted"}
                  className="absolute top-3 left-3"
                />

                {group.items.length > 1 && (
                  <span className="absolute top-3 right-3 rounded-pill bg-black/55 px-1.5 text-[0.65rem] font-semibold text-white">
                    {group.items.length}
                  </span>
                )}

                <span className="absolute inset-x-2 bottom-2 truncate text-left text-xs font-semibold text-white">
                  {group.isViewer ? "Your story" : author.name}
                </span>
              </button>
            );
          })}

        {!loading && !error && groups.length === 0 && (
          <div className="grid h-story-h flex-1 place-items-center rounded-card bg-surface px-4 text-center shadow-card">
            <p className="text-sm text-ink-muted">
              No stories yet. Share one, or wait for a friend to.
            </p>
          </div>
        )}

        {error && (
          <div className="grid h-story-h flex-1 place-items-center rounded-card bg-surface px-4 text-center shadow-card">
            <p className="text-sm text-alert">{error}</p>
          </div>
        )}
      </div>

      {creating && (
        <CreateStoryModal onClose={() => setCreating(false)} onPosted={load} />
      )}

      {openAt !== null && (
        <StoryViewer
          groups={groups}
          startAt={openAt}
          onClose={() => setOpenAt(null)}
          onSeen={markSeen}
          onDeleted={dropStory}
        />
      )}
    </>
  );
}
