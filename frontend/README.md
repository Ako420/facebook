# Facebook Clone — React + Tailwind CSS

An internship project: a four-page Facebook clone (Home, Reels, Friends, Profile) built in dark mode
with React 19 and Tailwind CSS v4.

The goal was not to ship a social network. It was to practise the parts of front-end work that are
hard to practise on small exercises: building a component system, working from a design instead of
inventing one, wiring a typed data layer into a UI, and making the same layout work from 420px to
1440px.

---

## Table of contents

- [Stack](#stack)
- [Getting started](#getting-started)
- [Screens](#screens)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Pages and features](#pages-and-features)
- [What I learned](#what-i-learned)
- [Problems I hit and how I solved them](#problems-i-hit-and-how-i-solved-them)
- [Known limitations](#known-limitations)
- [Next steps](#next-steps)

---

## Stack

| Tool | Version | Why it is here |
|---|---|---|
| React | 19 | Component model, hooks, local UI state |
| Vite | 8 | Dev server with HMR, production build |
| Tailwind CSS | 4 | Utility styling, CSS-first theme configuration |
| `@tailwindcss/vite` | 4 | Tailwind as a Vite plugin, no PostCSS config |
| FontAwesome | 7 | Icon set (solid, regular, brands) |
| TypeScript syntax | — | `.ts` / `.tsx` files, types stripped by esbuild |
| ESLint | 10 | Linting for `.js` / `.jsx` |

No routing library, no state manager, no component library. Everything in `src/components` is
written from scratch — that was the point of the exercise.

## Getting started

```bash
npm install
```

```bash
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server on http://localhost:5173 |
| `npm run build` | Type-strip, bundle and minify into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

Navigation uses the URL hash, so pages are directly linkable:
`#/`, `#/reels`, `#/friends`, `#/profile/u1`.

## Screens

All four pages, dark mode, captured at 1440×900 (and 420×860 for mobile).

### Home

Story / Reels tab card, composer, and the feed.

![Home](docs/screenshots/home.png)

### Friends

Friends sidebar, friend requests, People you may know, birthdays and all friends.

![Friends](docs/screenshots/friends.png)

### Reels

Full-height scroll-snapped player with autoplay, mute and step controls.

![Reels](docs/screenshots/reels.png)

### Profile

Cover, avatar, friend stack, action buttons and the tab bar.

![Profile](docs/screenshots/profile.png)

### Mobile

Header collapses, sidebars drop away, bottom tab bar takes over navigation.

<img src="docs/screenshots/mobile-home.png" alt="Home on mobile" width="320">

## Project structure

```
src/
├── App.jsx                    Route table + app shell (header, page, bottom nav)
├── main.jsx                   React root
├── index.css                  Design tokens (@theme) and base styles
│
├── data/                      Mock data layer (typed fixtures, provided)
│   ├── types.ts               User, Post, Reel, Story, Comment, Group, ...
│   ├── users.ts               People + currentUser
│   ├── posts.ts               Feed posts with comments and reactions
│   ├── reels.ts               Reels with real playable mp4 URLs
│   ├── stories.ts             Story rail
│   ├── friends.ts             Friends, requests, suggestions, birthdays
│   ├── navigation.ts          Sidebar / bottom nav / header config
│   └── ...                    messages, notifications, groups, marketplace
│
├── lib/
│   ├── cn.ts                  Class-name joiner
│   ├── format.ts              formatCount, formatRelativeTime, formatPrice, ...
│   └── router.ts              Hash router (useRoute, navigate, isActive)
│
├── components/
│   ├── HomeCard.tsx           Tab switcher between the story rail and the reels row
│   ├── icons/Icon.tsx         FontAwesome wrapper — semantic icon names
│   ├── ui/                    Primitives: Avatar, Card, IconButton, Reaction
│   ├── layout/                Header, LeftSidebar, RightRail, BottomNav, PageShell
│   ├── feed/                  StoryRail, Composer, ReelsRow, PostCard, PostMedia, CommentThread
│   ├── friends/               FriendsSidebar, PersonCard
│   ├── reels/                 ReelItem
│   └── profile/               ProfileHeader, ProfileCards
│
└── pages/                     HomePage, ReelsPage, FriendsPage, ProfilePage
```

## Architecture

### 1. Design tokens live in CSS, not in a config file

Tailwind v4 is configured inside `src/index.css` with `@theme`. Every token becomes a utility
automatically:

```css
@theme static {
  --color-canvas: #18191a;          /* → bg-canvas      */
  --color-surface: #242526;         /* → bg-surface     */
  --color-surface-raised: #3a3b3c;  /* → bg-surface-raised */
  --color-ink: #e4e6eb;             /* → text-ink       */
  --spacing-header: 3.5rem;         /* → h-header, pt-header, top-header */
  --container-feed: 36.875rem;      /* → max-w-feed     */
  --radius-card: 0.75rem;           /* → rounded-card   */
}
```

Tokens are named by **role** (`canvas`, `surface`, `surface-raised`, `ink`, `ink-muted`, `line`),
not by colour. No component contains a raw hex value for a surface or text colour, so the whole
theme can be changed from one file.

### 2. Three layers of components

```
pages/          compose features into a screen, own page-level state
  └── feature/  PostCard, ReelItem, PersonCard, ProfileHeader — know about the data shapes
        └── ui/ Avatar, Card, IconButton, Reaction — know nothing about the domain
```

A page file stays short and readable because it mostly wires features together:

```jsx
<PageShell>
  <div className="mx-auto flex max-w-feed flex-col gap-4">
    <HomeCard />
    <Composer />
    {posts.map((post) => <PostCard key={post.id} post={post} />)}
  </div>
</PageShell>
```

### 3. The data layer is treated like an API

Components import types and selectors from `src/data`, never hard-coded content:

| Data | Used by |
|---|---|
| `posts`, `feed`, `totalReactions` | `HomePage`, `PostCard` |
| `orderedStories` | `StoryRail`, `HomeCard` |
| `reels` | `ReelsPage`, `ReelsRow`, Profile → Videos |
| `friends`, `friendRequests`, `friendSuggestions`, `birthdaysToday` | `FriendsPage` |
| `contacts`, `listings` | `RightRail` |
| `sidebarNav`, `bottomNav`, `shortcuts`, `headerActions` | `LeftSidebar`, `BottomNav`, `Header` |
| `currentUser`, `userById`, `postsByAuthor` | `ProfilePage` |

Because every record is a plain object with string ids and ISO dates, replacing the fixtures with
`fetch()` calls later would not require touching a single component.

### 4. Routing without a router

`src/lib/router.ts` subscribes to `hashchange` through `useSyncExternalStore`:

```ts
export function useRoute(): Route {
  return parseRoute(useSyncExternalStore(subscribe, readHash, () => "/"));
}
```

`App.jsx` maps the parsed route name to a page component. `navigate()` ignores hrefs that are not
real routes, so decorative nav items (Marketplace, Gaming) do not break the app.

### 5. Icons

`components/icons/Icon.tsx` maps semantic names to FontAwesome definitions, so components say what
they mean and the icon set stays swappable:

```jsx
<Icon name="thumb" size={17} />
<Icon name="messenger" />
<VerifiedBadge size={13} />
```

## Pages and features

**Home** — a card that tabs between the story rail (unseen stories get the blue ring) and the
horizontal reels row, then the post composer and the feed. `PostCard` handles every content shape in the fixtures: single photo, 2/3/4-up album with
a `+N` overlay, text-only post with a gradient background, video with a poster frame, shared link
preview, feeling and location, and privacy icon (public / friends / only-me). Hovering Like opens
the seven-reaction picker; the reaction chips and total update live. Comments expand inline, with
nested replies and a working comment box.

**Reels** — a full-height, scroll-snapped vertical feed. Each reel autoplays when it scrolls into
view and pauses when it leaves (`IntersectionObserver`), click toggles play/pause, mute is shared
across the whole feed, and the chevron buttons scroll exactly one reel at a time.

**Friends** — the Friends-specific sidebar (Home, Friend requests, Suggestions, All friends,
Birthdays, Custom lists) plus sections for requests, People you may know, birthdays and all friends.
Add friend / Confirm / Remove / Delete all update the UI immediately.

**Profile** — cover photo, overlapping avatar, friend stack, action buttons and a working tab bar
(Posts, About, Friends, Photos, Videos). It is generic: clicking any author, contact or friend card
anywhere in the app opens that person's profile at `#/profile/:id`.

**Responsive** — three columns at `xl`, centre + right rail at `lg`, single column below that, with
a bottom tab bar replacing the header nav on mobile.

## What I learned

**Design tokens are worth setting up before writing any component.** My first instinct was to write
`bg-[#242526]` everywhere. Naming the value once as `--color-surface` and using `bg-surface` meant
that when a card, the header and the sidebar all had to match, they simply did — and I could reason
about the design in terms of "canvas, surface, raised" instead of remembering hex codes.

**Props are an API, and a good one prevents copy-paste.** `PersonCard` renders friend suggestions,
incoming requests and the full friends list. Instead of three near-identical components, it takes
`primaryLabel`, `secondaryLabel`, `done` and two handlers. Designing that prop shape took longer
than copying the file would have, and saved much more than it cost.

**Derive state, don't duplicate it.** The reaction total is computed from the fixture count minus
the viewer's original reaction plus their current one. Storing a second counter in state would have
been easier to write and would have drifted out of sync the first time anything else changed it.

**Composition beats configuration.** `PageShell` owns the three-column layout; `HomePage` does not
know the sidebar exists. When the Friends page needed a different sidebar, it just didn't use
`PageShell`. No flags, no conditionals inside the layout.

**One piece of state can drive a whole section.** The home page originally stacked the story rail
and the reels row. I replaced them with `HomeCard`, which holds the active tab in state and renders
one or the other. Both children stayed untouched — they do not know they are inside a tab — which is
what made the change a small one instead of a rewrite.

**Browser APIs solve problems I would otherwise write bad JavaScript for.** CSS `scroll-snap` gives
the reels feed its snapping behaviour with two utility classes. `IntersectionObserver` handles
autoplay without scroll listeners or throttling. `loading="lazy"` plus a placeholder background
keeps a long feed cheap and stops layout from jumping while images arrive.

**`useSyncExternalStore` is how you subscribe to something outside React.** Writing the hash router
by hand taught me what a router library actually does: read external state, subscribe to its change
event, unsubscribe on unmount, and re-render.

**Accessibility is also a testing tool.** Giving every icon-only button an `aria-label` was meant to
be good practice; it also made the UI testable, because a button can be found by its accessible name
instead of a brittle CSS selector.

**Verify in the browser, not in your head.** Every page in this project was screenshotted and
click-tested — like a post, post a comment, add a friend, switch profile tabs, step through reels —
before I called it finished. Several layout bugs only appeared when I actually looked.

## Problems I hit and how I solved them

**Icon sizing with FontAwesome.** FontAwesome icons have different intrinsic aspect ratios, so
setting both width and height distorts them. Setting `fontSize` instead lets height follow the size
and width scale proportionally.

**Empty profile timeline.** `postsByAuthor(currentUser.id)` returned nothing, so the signed-in
user's profile had an empty feed. I added two posts authored by the current user to `data/posts.ts`
(ids `p7` and `p8`) and also built a proper empty state, since any other user's profile can still
have no posts.

**Import boundaries.** I first imported `formatRelativeTime` from `src/data`, which does not
re-export it, and the app failed to load at runtime. Formatting helpers live in `src/lib/format.ts`
and are imported from there — `data` describes *what* the app knows, `lib` describes *how* it is
displayed, and keeping that boundary clean avoids circular imports.

**Slow remote images.** The fixtures use remote placeholder services, so images arrive at different
times. Every image container now carries a `bg-surface-raised` placeholder and a fixed aspect ratio,
so a partially loaded page looks deliberate instead of broken.

## Known limitations

- State is in-memory only. Likes, comments and friend requests reset on reload; there is no backend.
- Search, Messenger, Marketplace, Groups and Gaming are visual only — those nav items do not route.
- ESLint only covers `.js` / `.jsx`; the `.tsx` files are type-stripped by esbuild and are not
  type-checked in CI.
- No automated test suite; verification so far has been manual and browser-driven.

## Next steps

- Swap the fixtures for a real API and add loading and error states.
- Add `typescript-eslint` and a `tsc --noEmit` check so the types in `src/data/types.ts` are enforced.
- Extract post/reel interactions into a reducer or context once more than one screen mutates them.
- Add a light theme by redefining the same tokens under a `[data-theme]` selector — the components
  themselves would not change.
