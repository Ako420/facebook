/* ============================================================================
   Pages the current user manages or follows — "Your Pages And Profiles".
   ========================================================================== */

import type { Author, ID, Page } from "./types";
import { avatar, photo } from "./media";

export const pages = {
  pitchReport: {
    id: "pg1",
    name: "Pitch Report",
    handle: "@pitchreport",
    avatar: avatar(70, 160),
    cover: photo("pitchreport-cover", 1200, 400),
    category: "Sports News",
    followerCount: 184_000,
    unreadCount: 4,
    isVerified: true,
  },
  maidan: {
    id: "pg2",
    name: "Maidan Cricket Club",
    handle: "@maidancc",
    avatar: avatar(64, 160),
    cover: photo("maidan-cover", 1200, 400),
    category: "Amateur Sports Team",
    followerCount: 3_420,
    unreadCount: 0,
    isVerified: false,
  },
  coverDrive: {
    id: "pg3",
    name: "Cover Drive Weekly",
    handle: "@coverdrive",
    avatar: avatar(58, 160),
    cover: photo("coverdrive-cover", 1200, 400),
    category: "Magazine",
    followerCount: 61_500,
    unreadCount: 1,
    isVerified: true,
  },
} satisfies Record<string, Page>;

export const managedPages: Page[] = [pages.pitchReport, pages.maidan];

export const pageById = (id: ID): Page | undefined =>
  Object.values(pages).find((p) => p.id === id);

/** Narrows a Page down to the shape posts, stories and reels carry. */
export const asPageAuthor = (page: Page): Author => ({
  id: page.id,
  name: page.name,
  avatar: page.avatar,
  isVerified: page.isVerified,
  kind: "page",
});
