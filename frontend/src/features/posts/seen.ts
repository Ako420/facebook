import { useEffect, useRef } from "react";
import { markPostsViewed } from "./postApi";

const FLUSH_MS = 1_500;
const DWELL_MS = 1_000;
const VISIBLE_RATIO = 0.5;

const reported = new Set<string>();
const queue = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;

const flush = async () => {
  timer = undefined;
  if (queue.size === 0) return;

  const ids = [...queue];
  queue.clear();

  try {
    await markPostsViewed(ids);
  } catch {
    ids.forEach((id) => reported.delete(id));
  }
};

/** Remembers that a post has been in front of this person, a batch at a time. */
export const reportSeen = (postId: string) => {
  if (reported.has(postId)) return;

  reported.add(postId);
  queue.add(postId);
  if (!timer) timer = setTimeout(flush, FLUSH_MS);
};

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", () => {
    flush();
  });
}

/**
 * Attach the returned ref to a post. It counts as seen once half of it has
 * been on screen for a second, which keeps a fast scroll past from burning
 * through the feed.
 */
export function useSeen(postId: string) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let dwell: ReturnType<typeof setTimeout> | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          dwell = setTimeout(() => reportSeen(postId), DWELL_MS);
        } else {
          clearTimeout(dwell);
        }
      },
      { threshold: VISIBLE_RATIO },
    );

    observer.observe(node);

    return () => {
      clearTimeout(dwell);
      observer.disconnect();
    };
  }, [postId]);

  return ref;
}
