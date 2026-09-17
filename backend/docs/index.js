import { responses, schemas, securitySchemes } from './components.js';
import { authPaths } from './paths/auth.js';
import { postPaths } from './paths/posts.js';
import { commentPaths } from './paths/comments.js';
import { friendPaths } from './paths/friends.js';
import { groupPaths } from './paths/groups.js';
import { conversationPaths } from './paths/conversations.js';
import { storyPaths } from './paths/stories.js';
import { uploadPaths } from './paths/upload.js';
import { notificationPaths } from './paths/notifications.js';

/**
 * The whole OpenAPI document. Everything lives here and under ./paths, so the
 * routers stay plain routing code with no documentation mixed in.
 */
export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Facebook Clone API',
    version: '1.0.0',
    description:
      'REST API for the Facebook clone: accounts, posts, reels, reactions, comments, friends, '
      + 'groups, messages and stories.\n\n'
      + '**Signing in:** call `POST /auth/register` or `POST /auth/login`, copy the `token` from '
      + 'the response, then press **Authorize** above and paste it. Every route except register '
      + 'and login needs it.\n\n'
      + '**Reels are posts.** A reel is a post with `type: "reel"` and exactly one video, so posts '
      + 'and reels share the same endpoints, including comments and reactions.\n\n'
      + '**Realtime.** Open a WebSocket to `ws://localhost:3000/ws` and send '
      + '`{ "type": "auth", "token": "<jwt>", "lastEventId": "<id or null>" }` as the first '
      + 'frame. The server answers `{ "type": "ready", "data": { "userId", "resync" } }`.\n\n'
      + 'Events about you carry an `id` (`message:new`, `message:updated`, `message:hidden`, '
      + '`conversation:read`, `conversation:receipt`, `conversation:updated`, '
      + '`conversation:removed`, '
      + '`notification:new`, `notification:read`, `notification:removed`, `friends:changed`). '
      + 'Send the last id you saw when reconnecting: anything you missed in the last five '
      + 'minutes is replayed right after `ready`. When `resync` is true the gap could not be '
      + 'covered, so refetch over REST.\n\n'
      + '`conversation:receipt` carries `{ conversationId, userIds, kind, at }`, where kind is '
      + '"delivered" (it reached their open tab) or "seen" (they opened the chat). Fold it into '
      + 'the participants of that conversation to draw one tick, two ticks, or two blue ticks.\n\n'
      + 'Live-only events have no id and are never replayed: `typing`, `presence:changed` '
      + '(friends only), and, for posts you subscribe to, `comment:new`, `comment:deleted` and '
      + '`post:reactions`.\n\n'
      + 'After `ready` a client may send `{ "type": "typing", "conversationId" }`, '
      + '`{ "type": "subscribe", "topic": "post:<id>" }` and `{ "type": "unsubscribe", "topic" }`. '
      + 'Subscriptions are checked against who may read the post. Every write still goes '
      + 'through these REST routes.\n\n'
      + 'Close codes: 1008 more than 40 frames in 10 seconds, 1011 realtime unavailable, '
      + '4001 bad, expired or revoked token, 4002 no auth frame within 5 seconds, '
      + '4003 account deactivated.\n\n'
      + 'Set `REDIS_URL` to run several backend instances: events, presence and the replay '
      + 'log then go through Redis 7+ instead of process memory.\n\n'
      + '**Rate limits:** `/api/auth/*` allows 20 requests per 15 minutes per IP; everything else '
      + 'allows 500.',
  },
  servers: [{ url: 'http://localhost:3000/api', description: 'Local development' }],
  tags: [
    { name: 'Auth', description: 'Register, sign in and manage your account' },
    { name: 'Posts', description: 'Posts and reels (a reel is a post with type "reel")' },
    { name: 'Reactions', description: 'One reaction per person per post' },
    { name: 'Comments', description: 'Comments on a post or reel' },
    { name: 'Friends', description: 'Requests, friends and suggestions' },
    { name: 'Groups', description: 'Create, join and manage groups' },
    { name: 'Messages', description: 'Direct and group chats. New messages are pushed over /ws.' },
    { name: 'Notifications', description: 'Friend requests, comments, reactions, group invites' },
    { name: 'Stories', description: 'Photos, videos and text that lapse after 24 hours' },
    { name: 'Upload', description: 'Send images and videos to Cloudinary' },
  ],
  components: { securitySchemes, schemas, responses },
  security: [{ bearerAuth: [] }],
  paths: {
    ...authPaths,
    ...postPaths,
    ...commentPaths,
    ...friendPaths,
    ...groupPaths,
    ...conversationPaths,
    ...storyPaths,
    ...uploadPaths,
    ...notificationPaths,
  },
};
