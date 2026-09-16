import { json, messageOnly, ok, pathId } from '../helpers.js';

export const friendPaths = {
  '/friend/user': {
    get: {
      tags: ['Friends'],
      summary: 'Your friends and pending requests',
      description:
        'Searches both directions, so requests you received show up under `incoming` '
        + 'and ones you sent under `outgoing`.',
      responses: {
        200: ok('Your friendships, split three ways.', {
          $ref: '#/components/schemas/FriendLists',
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/friend/suggestions': {
    get: {
      tags: ['Friends'],
      summary: 'People you may know',
      description:
        'Active accounts you are not already connected to in either direction, newest first.',
      parameters: [
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 20, maximum: 50 },
        },
      ],
      responses: {
        200: ok('Suggested people.', {
          type: 'object',
          properties: {
            users: { type: 'array', items: { $ref: '#/components/schemas/Person' } },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/friend': {
    post: {
      tags: ['Friends'],
      summary: 'Send a friend request',
      description:
        'Refused if you target yourself, if the account does not exist, or if a request '
        + 'already exists in either direction.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['friendId'],
          properties: {
            friendId: { type: 'string', description: 'The other person\'s user id.' },
          },
        }),
      },
      responses: {
        201: ok('Request sent.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Friend request sent' },
            friend: { $ref: '#/components/schemas/FriendEdge' },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        409: ok('A request already exists between you two.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'Friend request already exists' }),
      },
    },
  },

  '/friend/{id}': {
    parameters: [pathId('id', 'Friendship id, from GET /friend/user.')],

    get: {
      tags: ['Friends'],
      summary: 'Get one friendship row',
      responses: {
        200: ok('The friendship.', {
          type: 'object',
          properties: { friend: { $ref: '#/components/schemas/FriendEdge' } },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },

    put: {
      tags: ['Friends'],
      summary: 'Accept or reject a request',
      description:
        'Only the person who received the request may answer it. Accepting raises '
        + "both people's friendsCount, and only on a real change, so calling it twice "
        + 'does not double-count.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['pending', 'accepted', 'rejected'] },
          },
        }),
      },
      responses: {
        200: ok('Status updated.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Friend status updated' },
            friend: { $ref: '#/components/schemas/FriendEdge' },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: ok('Only the recipient can answer a request.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'Only the person who received this request can answer it.' }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },

    delete: {
      tags: ['Friends'],
      summary: 'Unfriend, decline a request, or cancel one you sent',
      description:
        'All three are the same operation: the row is removed. Only the two people '
        + 'involved may do it, and friendsCount only drops if the request had been accepted.',
      responses: {
        200: messageOnly('Friendship removed.', 'Friend deleted'),
        401: { $ref: '#/components/responses/Unauthorized' },
        403: ok('You are not part of this friendship.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'You are not part of this friendship.' }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
