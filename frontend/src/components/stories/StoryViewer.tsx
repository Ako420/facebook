import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { cn } from "../../lib/cn";
import { formatCount, formatRelativeTime } from "../../lib/format";
import { toPerson } from "../../features/friends/friendApi";
import {
  deleteStory,
  listStoryViewers,
  markStorySeen,
  timeLeft,
} from "../../features/stories/storyApi";
import type { ApiStoryGroup, ApiStoryViewer } from "../../features/stories/storyApi";

/** How long a picture or a few words stay up. Videos run their own length. */
const STILL_MS = 5000;

export function StoryViewer({
  groups,
  startAt,
  onClose,
  onSeen,
  onDeleted,
}: {
  groups: ApiStoryGroup[];
  startAt: number;
  onClose: () => void;
  onSeen: (storyId: string) => void;
  onDeleted: (storyId: string) => void;
}) {
  const navigate = useNavigate();

  const [groupIndex, setGroupIndex] = useState(startAt);
  // Opening someone's tray starts at the first thing you have not seen. Worked
  // out once, on open: recomputing it as stories get marked seen would keep
  // dragging the viewer back to the start.
  const [itemIndex, setItemIndex] = useState(() => {
    const items = groups[startAt]?.items ?? [];
    const at = items.findIndex((row) => !row.seen);
    return at === -1 ? 0 : at;
  });
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [viewers, setViewers] = useState<ApiStoryViewer[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const video = useRef<HTMLVideoElement>(null);
  const reported = useRef(new Set<string>());

  const group = groups[groupIndex];
  const story = group?.items[itemIndex];

  const close = useCallback(() => onClose(), [onClose]);

  const step = useCallback(
    (delta: number) => {
      setProgress(0);
      setViewers(null);

      setItemIndex((current) => {
        const next = current + delta;
        const items = groups[groupIndex]?.items ?? [];

        if (next >= 0 && next < items.length) return next;

        // Past either end of a person's stories, move to the next person.
        const nextGroup = groupIndex + (next < 0 ? -1 : 1);
        if (nextGroup < 0 || nextGroup >= groups.length) {
          close();
          return current;
        }

        setGroupIndex(nextGroup);
        return next < 0 ? Math.max(0, (groups[nextGroup]?.items.length ?? 1) - 1) : 0;
      });
    },
    [groupIndex, groups, close],
  );

  // Telling the server counts once; the ref stops a re-render doing it again.
  useEffect(() => {
    if (!story || reported.current.has(story.id)) return;

    reported.current.add(story.id);
    markStorySeen(story.id)
      .then(() => onSeen(story.id))
      .catch(() => undefined);
  }, [story, onSeen]);

  const stepRef = useRef(step);
  stepRef.current = step;

  // Stills advance on a timer; a video advances when it ends.
  useEffect(() => {
    if (!story || story.type === "video" || paused) return;

    const started = Date.now();
    const timer = window.setInterval(() => {
      const ratio = (Date.now() - started) / STILL_MS;
      if (ratio >= 1) {
        window.clearInterval(timer);
        stepRef.current(1);
      } else {
        setProgress(ratio);
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [story?.id, story?.type, paused]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, step]);

  const openViewers = async () => {
    if (!story) return;
    setPaused(true);

    try {
      const result = await listStoryViewers(story.id);
      setViewers(result.viewers);
    } catch {
      setViewers([]);
    }
  };

  const remove = async () => {
    if (!story) return;
    setBusy(true);

    try {
      await deleteStory(story.id);
      onDeleted(story.id);
      setConfirming(false);
      close();
    } catch {
      setBusy(false);
      setConfirming(false);
    }
  };

  const author = useMemo(
    () => (group ? toPerson(group.author) : null),
    [group],
  );

  if (!group || !story || !author) return null;

  return (
    <div className="fixed inset-0 z-100 flex flex-col bg-black/95">
      <div className="relative mx-auto flex h-full w-full max-w-[26rem] flex-col">
        <div className="flex gap-1 px-2 pt-3">
          {group.items.map((row, index) => (
            <span
              key={row.id}
              className="h-0.5 flex-1 overflow-hidden rounded-pill bg-white/30"
            >
              <span
                className="block h-full bg-white"
                style={{
                  width:
                    index < itemIndex
                      ? "100%"
                      : index === itemIndex
                        ? `${Math.min(100, progress * 100)}%`
                        : "0%",
                }}
              />
            </span>
          ))}
        </div>

        <header className="flex items-center gap-2 px-3 py-2">
          <Avatar
            src={author.avatar}
            alt={author.name}
            size={34}
            onClick={() => {
              close();
              navigate(`/profile/${group.author.id}`);
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{author.name}</p>
            <p className="text-[0.7rem] text-white/70">
              {formatRelativeTime(story.createdAt)} · {timeLeft(story)}
            </p>
          </div>

          {story.type === "video" && (
            <button
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted((value) => !value)}
              className="grid size-8 place-items-center rounded-pill text-white hover:bg-white/15"
            >
              <Icon name={muted ? "volume-off" : "volume"} size={15} />
            </button>
          )}

          {group.isViewer && (
            <button
              aria-label="Delete story"
              onClick={() => {
                setPaused(true);
                setConfirming(true);
              }}
              className="grid size-8 place-items-center rounded-pill text-white hover:bg-white/15"
            >
              <Icon name="close" size={14} />
            </button>
          )}

          <button
            aria-label="Close stories"
            onClick={close}
            className="grid size-8 place-items-center rounded-pill text-white hover:bg-white/15"
          >
            <Icon name="chevron-down" size={15} />
          </button>
        </header>

        <div className="relative min-h-0 flex-1">
          {story.type === "video" ? (
            <video
              ref={video}
              key={story.id}
              src={story.media?.url}
              poster={story.media?.poster}
              autoPlay
              muted={muted}
              playsInline
              onTimeUpdate={(event) => {
                const el = event.currentTarget;
                if (el.duration) setProgress(el.currentTime / el.duration);
              }}
              onEnded={() => step(1)}
              className="size-full bg-black object-contain"
            />
          ) : story.media ? (
            <img
              src={story.media.url}
              alt={story.text || "Story"}
              className="size-full object-contain"
            />
          ) : (
            <div
              style={{ background: story.background ?? "#1877f2" }}
              className="grid size-full place-items-center px-8 text-center"
            >
              <p className="text-2xl leading-snug font-semibold text-white">{story.text}</p>
            </div>
          )}

          {/* Tap the sides to move through, the way stories work everywhere. */}
          <button
            aria-label="Previous"
            onClick={() => step(-1)}
            className="absolute inset-y-0 left-0 w-1/3"
          />
          <button
            aria-label="Next"
            onClick={() => step(1)}
            className="absolute inset-y-0 right-0 w-1/3"
          />

          {story.media && story.text && (
            <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-10 pb-5 text-center text-[0.95rem] text-white">
              {story.text}
            </p>
          )}
        </div>

        {group.isViewer && (
          <footer className="px-3 py-3">
            <button
              onClick={openViewers}
              className="flex items-center gap-2 rounded-pill bg-white/15 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/25"
            >
              <Icon name="users" size={13} />
              {formatCount(story.viewCount ?? 0)} viewer
              {(story.viewCount ?? 0) === 1 ? "" : "s"}
            </button>
          </footer>
        )}

        {viewers && (
          <div className="absolute inset-x-0 bottom-0 max-h-[60%] overflow-y-auto rounded-t-card bg-surface p-3">
            <div className="flex items-center justify-between pb-2">
              <p className="text-[0.95rem] font-semibold text-ink">
                Seen by {formatCount(viewers.length)}
              </p>
              <button
                aria-label="Close viewers"
                onClick={() => {
                  setViewers(null);
                  setPaused(false);
                }}
                className="grid size-8 place-items-center rounded-pill text-ink-muted hover:bg-surface-hover"
              >
                <Icon name="close" size={13} />
              </button>
            </div>

            {viewers.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">
                Nobody has watched this yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {viewers.map((row) => {
                  const person = toPerson(row.user);
                  return (
                    <li key={row.id} className="flex items-center gap-3 rounded-lg p-2">
                      <Avatar src={person.avatar} alt={person.name} size={36} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                        {person.name}
                      </span>
                      <span className="text-xs text-ink-faint">
                        {formatRelativeTime(row.seenAt)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {confirming && (
        <ConfirmDialog
          title="Delete story?"
          message="It disappears for everyone straight away, along with its photo or video."
          confirmLabel={busy ? "Deleting..." : "Delete"}
          pending={busy}
          onConfirm={remove}
          onCancel={() => {
            setConfirming(false);
            setPaused(false);
          }}
        />
      )}
    </div>
  );
}
