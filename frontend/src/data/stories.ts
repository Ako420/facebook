/* ============================================================================
   Stories rail. Unseen stories sort first, which is what the ring highlight
   in the UI keys off.
   ========================================================================== */

import type { MediaItem, Story } from "./types";
import { portrait, video } from "./media";
import { asAuthor, users } from "./users";
import { hoursAgo, minutesAgo } from "./time";

const image = (seed: string, alt: string): MediaItem => ({
  type: "image",
  url: portrait(seed),
  alt,
  width: 720,
  height: 1280,
});

const clip = (index: number, seed: string, alt: string): MediaItem => ({
  type: "video",
  url: video(index),
  poster: portrait(seed),
  alt,
  width: 720,
  height: 1280,
});

export const stories: Story[] = [
  {
    id: "st1",
    author: asAuthor(users.neha),
    media: image("story-neha", "Sunset over an empty stadium"),
    createdAt: minutesAgo(24),
    seen: false,
  },
  {
    id: "st2",
    author: asAuthor(users.rohan),
    media: clip(2, "story-rohan", "Nets session in slow motion"),
    createdAt: hoursAgo(1),
    seen: false,
  },
  {
    id: "st3",
    author: asAuthor(users.kabir),
    media: image("story-kabir", "Keeping gloves drying on a bench"),
    createdAt: hoursAgo(2),
    seen: false,
  },
  {
    id: "st4",
    author: asAuthor(users.priya),
    media: image("story-priya", "Match day breakfast"),
    createdAt: hoursAgo(3),
    seen: false,
  },
  {
    id: "st5",
    author: asAuthor(users.meera),
    media: clip(4, "story-meera", "Walking out to the middle"),
    createdAt: hoursAgo(5),
    seen: true,
  },
  {
    id: "st6",
    author: asAuthor(users.tara),
    media: image("story-tara", "Scorebook after a tight finish"),
    createdAt: hoursAgo(7),
    seen: true,
  },
  {
    id: "st7",
    author: asAuthor(users.ishaan),
    media: image("story-ishaan", "New spikes, first outing"),
    createdAt: hoursAgo(9),
    seen: true,
  },
  {
    id: "st8",
    author: asAuthor(users.dev),
    media: image("story-dev", "Covers coming off at last"),
    createdAt: hoursAgo(14),
    seen: true,
  },
];

/** Unseen first, then newest first — the order the rail should render in. */
export const orderedStories: Story[] = [...stories].sort(
  (a, b) =>
    Number(a.seen) - Number(b.seen) ||
    Date.parse(b.createdAt) - Date.parse(a.createdAt),
);
