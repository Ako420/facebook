import { ok, pathId } from '../helpers.js';

const unreadOnly = (description) =>
  ok(description, {
    type: 'object',
    properties: {
      message: { type: 'string' },
      unread: { type: 'integer', example: 0 },
    },
  });

export const notificationPaths = {
  '/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'Your notifications',
      description:
        'Newest first, 20 at a time. Pass the previous `nextCursor` as `before` for the next '
        + 'page; a null cursor means there is nothing older. `unread` is the badge number.\n\n'
        + 'Created for: friend requests sent to you and accepted, comments and first reactions '
        + 'on your posts, and group invitations. Chat messages are not notifications — they '
        + 'have their own badge under `/conversations/unread`.',
      parameters: [
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 50 } },
        {
          name: 'before',
          in: 'query',
          schema: { type: 'string' },
          description: 'The `nextCursor` from the previous page.',
        },
      ],
      responses: {
        200: ok('One page of notifications.', {
          type: 'object',
          properties: {
            notifications: {
              type: 'array',
              items: { $ref: '#/components/schemas/Notification' },
            },
            nextCursor: { type: 'string', nullable: true },
            unread: { type: 'integer', example: 3 },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/notifications/unread': {
    get: {
      tags: ['Notifications'],
      summary: 'Unread count for the bell badge',
      responses: {
        200: ok('How many are unread.', {
          type: 'object',
          properties: { unread: { type: 'integer', example: 3 } },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/notifications/read': {
    post: {
      tags: ['Notifications'],
      summary: 'Mark every notification as read',
      responses: {
        200: unreadOnly('All read.'),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/notifications/{id}/read': {
    post: {
      tags: ['Notifications'],
      summary: 'Mark one notification as read',
      parameters: [pathId('id', 'The notification id.')],
      responses: {
        200: unreadOnly('Marked read. `unread` is the new badge number.'),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
