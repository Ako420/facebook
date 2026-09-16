import { responses, schemas, securitySchemes } from './components.js';
import { authPaths } from './paths/auth.js';
import { postPaths } from './paths/posts.js';
import { commentPaths } from './paths/comments.js';
import { friendPaths } from './paths/friends.js';
import { groupPaths } from './paths/groups.js';
import { conversationPaths } from './paths/conversations.js';
import { storyPaths } from './paths/stories.js';
import { uploadPaths } from './paths/upload.js';

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
      + '**Messages have no realtime channel yet.** Poll `GET /conversations/unread` for the '
      + 'badge and `GET /conversations/{id}/messages` while a thread is open.\n\n'
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
    { name: 'Messages', description: 'Direct and group chats. No realtime push yet — poll.' },
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
  },
};
