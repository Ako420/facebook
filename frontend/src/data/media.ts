/* ============================================================================
   Placeholder media.
   Everything visual funnels through these four helpers, so swapping the
   remote placeholders for files in /public/assets is a one-file change.
   ========================================================================== */

/** Face photo. `seed` picks a consistent face (pravatar has 1-70). */
export const avatar = (seed: number, size = 160): string =>
  `https://i.pravatar.cc/${size}?img=${((seed - 1) % 70) + 1}`;

/** Deterministic photo — the same seed always returns the same image. */
export const photo = (seed: string, width = 900, height = 600): string =>
  `https://picsum.photos/seed/${seed}/${width}/${height}`;

/** Portrait crop, for stories and reels. */
export const portrait = (seed: string): string => photo(seed, 720, 1280);

const SAMPLE_VIDEOS = [
  "BigBuckBunny",
  "ElephantsDream",
  "ForBiggerBlazes",
  "ForBiggerEscapes",
  "ForBiggerFun",
  "ForBiggerJoyrides",
  "ForBiggerMeltdowns",
  "Sintel",
  "SubaruOutbackOnStreetAndDirt",
  "TearsOfSteel",
  "VolkswagenGTIReview",
  "WeAreGoingOnBullrun",
];

/** Public sample mp4 that a real <video> element can play. */
export const video = (index: number): string =>
  `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${
    SAMPLE_VIDEOS[index % SAMPLE_VIDEOS.length]
  }.mp4`;
