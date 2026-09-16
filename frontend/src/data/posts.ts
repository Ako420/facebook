import type { MediaItem, Post, ReactionCounts } from "./types";
import { photo, video } from "./media";
import { asAuthor, users } from "./users";
import { asPageAuthor, pages } from "./pages";
import { daysAgo, hoursAgo, minutesAgo } from "./time";

const image = (seed: string, alt: string): MediaItem => ({
  type: "image",
  url: photo(seed, 900, 600),
  alt,
  width: 900,
  height: 600,
});

export const posts: Post[] = [
  {
    id: "p1",
    author: asPageAuthor(pages.pitchReport),
    createdAt: hoursAgo(5),
    privacy: "public",
    text: "Five wickets in the first session and the follow-on is suddenly back on the table. Full session report and the ball-tracking data are in the link below.",
    media: [image("post-huddle", "Team huddle after a wicket")],
    reactions: { like: 1_240, love: 318, wow: 96 },
    commentCount: 214,
    shareCount: 87,
    viewerReaction: "like",
    isSaved: false,
    comments: [
      {
        id: "c1",
        author: asAuthor(users.rohan),
        text: "That spell before lunch was the whole match. Nothing else came close.",
        createdAt: hoursAgo(4),
        likeCount: 42,
        viewerLiked: false,
        replies: [
          {
            id: "c1r1",
            author: asAuthor(users.tara),
            text: "Six maidens on the trot. I checked the book twice.",
            createdAt: hoursAgo(3),
            likeCount: 11,
            viewerLiked: true,
            replies: [],
          },
        ],
      },
      {
        id: "c2",
        author: asAuthor(users.meera),
        text: "Writing this one up tonight. It deserves more than a match report.",
        createdAt: hoursAgo(2),
        likeCount: 88,
        viewerLiked: false,
        replies: [],
      },
    ],
  },
  {
    id: "p2",
    author: asAuthor(users.neha),
    createdAt: hoursAgo(9),
    privacy: "friends",
    text: "Shot the club final on Sunday. Four frames I keep coming back to.",
    media: [
      image("post-album-1", "Bowler mid delivery stride"),
      image("post-album-2", "Slip cordon waiting"),
      image("post-album-3", "Crowd on the grass bank"),
      image("post-album-4", "Trophy on the outfield at dusk"),
    ],
    location: "Maidan Ground, Bengaluru",
    reactions: { like: 486, love: 210, care: 14 },
    commentCount: 63,
    shareCount: 9,
    viewerReaction: "love",
    isSaved: true,
    comments: [
      {
        id: "c3",
        author: asAuthor(users.priya),
        text: "The third one. Print it, frame it, done.",
        createdAt: hoursAgo(8),
        likeCount: 27,
        viewerLiked: true,
        replies: [],
      },
    ],
  },
  {
    id: "p3",
    author: asAuthor(users.kabir),
    createdAt: hoursAgo(13),
    privacy: "public",
    text: "Dropped two catches today and still got player of the match. Cricket makes no sense and I love it.",
    media: [],
    background: "linear-gradient(135deg, #2374e1, #7b2ff7)",
    reactions: { haha: 402, like: 96 },
    commentCount: 51,
    shareCount: 4,
    viewerReaction: "haha",
    isSaved: false,
    comments: [
      {
        id: "c4",
        author: asAuthor(users.zoya),
        text: "Both off my bowling. I have notes.",
        createdAt: hoursAgo(12),
        likeCount: 156,
        viewerLiked: true,
        replies: [],
      },
    ],
  },
  {
    id: "p4",
    author: asAuthor(users.rohan),
    createdAt: daysAgo(1),
    privacy: "public",
    text: "Four months of rebuilding the action, one delivery to show for it. Worth every session.",
    media: [
      {
        type: "video",
        url: video(0),
        poster: photo("post-video-poster", 900, 506),
        alt: "Slow motion bowling action",
        width: 900,
        height: 506,
      },
    ],
    feeling: "proud",
    reactions: { like: 892, love: 143, wow: 271 },
    commentCount: 118,
    shareCount: 46,
    viewerReaction: null,
    isSaved: false,
    comments: [],
  },
  {
    id: "p5",
    author: asAuthor(users.meera),
    createdAt: daysAgo(2),
    privacy: "public",
    text: "Spent a week with the groundstaff who prepare these pitches at 4am. Nobody thanks them and every match depends on them.",
    media: [],
    link: {
      url: "https://coverdrive.example.com/the-people-who-make-the-pitch",
      domain: "coverdrive.example.com",
      title: "The people who make the pitch",
      description:
        "Before the toss, before the crowd, before the cameras — a week on the roller with the people who set the terms of the game.",
      image: photo("post-link-preview", 900, 470),
    },
    reactions: { like: 1_530, love: 604, care: 88 },
    commentCount: 176,
    shareCount: 312,
    viewerReaction: "love",
    isSaved: true,
    comments: [
      {
        id: "c5",
        author: asAuthor(users.dev),
        text: "My father did this for twenty-two years. Thank you for writing it.",
        createdAt: daysAgo(2),
        likeCount: 934,
        viewerLiked: true,
        replies: [],
      },
    ],
  },
  {
    id: "p6",
    author: asAuthor(users.tara),
    createdAt: daysAgo(3),
    privacy: "friends",
    text: "Scorebook is full. Twelve seasons in one notebook and it finally ran out of pages.",
    media: [image("post-scorebook", "A well used cricket scorebook")],
    feeling: "nostalgic",
    reactions: { love: 233, like: 141, care: 30 },
    commentCount: 29,
    shareCount: 2,
    viewerReaction: null,
    isSaved: false,
    comments: [],
  },
  {
    id: "p7",
    author: asAuthor(users.aarav),
    createdAt: hoursAgo(2),
    privacy: "friends",
    text: "New season, same opening partner. Nine years of running between the wickets with this one.",
    media: [image("post-openers", "Two openers walking out to bat")],
    location: "Maidan Ground, Bengaluru",
    reactions: { like: 214, love: 63, care: 5 },
    commentCount: 18,
    shareCount: 3,
    viewerReaction: null,
    isSaved: false,
    comments: [
      {
        id: "c6",
        author: asAuthor(users.kabir),
        text: "Ran you out twice this season. Still counts as a partnership.",
        createdAt: hoursAgo(1),
        likeCount: 34,
        viewerLiked: false,
        replies: [],
      },
    ],
  },
  {
    id: "p8",
    author: asAuthor(users.aarav),
    createdAt: daysAgo(4),
    privacy: "public",
    text: "Rebuilt the club scoreboard over the weekend. It runs on a laptop from 2013 and refuses to die.",
    media: [],
    feeling: "accomplished",
    reactions: { like: 168, wow: 41 },
    commentCount: 12,
    shareCount: 1,
    viewerReaction: "like",
    isSaved: false,
    comments: [],
  },
];

export const totalReactions = (reactions: ReactionCounts): number =>
  Object.values(reactions).reduce((sum, n) => sum + n, 0);


export const feed: Post[] = [...posts].sort(
  (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
);

export const savedPosts: Post[] = posts.filter((p) => p.isSaved);

export const postsByAuthor = (authorId: string): Post[] =>
  posts.filter((p) => p.author.id === authorId);

export const composerPrompt = (firstName: string): string =>
  `What's on your mind, ${firstName}?`;

export const draftPost = (text: string): Post => ({
  id: `p-${Date.now()}`,
  author: asAuthor(users.aarav),
  createdAt: minutesAgo(0),
  privacy: "friends",
  text,
  media: [],
  reactions: {},
  commentCount: 0,
  shareCount: 0,
  comments: [],
  viewerReaction: null,
  isSaved: false,
});
