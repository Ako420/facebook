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
      + '`{ "type": "auth", "token": "<jwt>" }` as the first frame; the server answers '
      + '`{ "type": "ready" }`. From then on it pushes `{ type, data }` events: '
      + '`message:new`, `message:updated`, `message:hidden`, `conversation:read`, '
      + '`conversation:updated`, `conversation:removed`, `notification:new`, '
      + '`notification:read`, `notification:removed` and `friends:changed`. The socket only '
      + 'carries news — every write still goes through these REST routes — so refetch over '
      + 'REST after reconnecting. Close codes: 4001 bad or expired token, 4002 no auth frame '
      + 'within 5 seconds, 4003 account deactivated.\n\n'
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
