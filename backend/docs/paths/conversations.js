import { json, messageOnly, ok, pathId } from '../helpers.js';

const conversationResponse = (description, message) =>
  ok(description, {
    type: 'object',
    properties: {
      message: { type: 'string', example: message },
      conversation: { $ref: '#/components/schemas/Conversation' },
    },
  });

const notInChat = ok(
  'No such chat, or you are not in it — both answer 404 so private threads are not leaked.',
  { $ref: '#/components/schemas/Error' },
  { message: 'Conversation not found.' },
);

export const conversationPaths = {
  '/conversations': {
    get: {
      tags: ['Messages'],
      summary: 'Your inbox',
      description:
        'Chats you are in, most recently active first, each with its last message, '
        + 'its participants and your own unread count. Chats you have deleted are left out '
        + 'until someone sends to them again.',
      parameters: [
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 50 } },
      ],
      responses: {
        200: ok('Your chats.', {
          type: 'object',
          properties: {
            conversations: {
              type: 'array',
              items: { $ref: '#/components/schemas/Conversation' },
            },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },

    post: {
      tags: ['Messages'],
      summary: 'Open a direct chat, or start a group chat',
      description:
        'Send `{ "userId": "..." }` to open a one-to-one chat. This is idempotent: if the '
        + 'thread already exists you get it back with **200** instead of a duplicate, so the '
        + 'client can call it every time the user presses Message.\n\n'
        + 'Send `{ "type": "group", "participantIds": [...] }` for a group chat. You become '
        + 'its admin, and it needs at least two other people.',
      requestBody: {
        required: true,
        content: json({
          oneOf: [
            {
              type: 'object',
              title: 'Direct chat',
              required: ['userId'],
              properties: {
                userId: { type: 'string', description: 'The person to message.' },
              },
            },
            {
              type: 'object',
              title: 'Group chat',
              required: ['type', 'participantIds'],
              properties: {
                type: { type: 'string', enum: ['group'] },
                name: { type: 'string', maxLength: 75, example: 'Weekend football' },
                participantIds: {
                  type: 'array',
                  minItems: 2,
                  items: { type: 'string' },
                  description: 'Everyone but you — you are added automatically.',
                },
                avatarUrl: { type: 'string', description: 'A URL from POST /upload.' },
              },
            },
          ],
        }),
      },
      responses: {
        200: conversationResponse('The chat already existed.', 'Chat opened.'),
        201: conversationResponse('Chat created.', 'Chat started.'),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: ok('One of those accounts is gone or deactivated.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'One of those accounts no longer exists.' }),
      },
    },
  },

  '/conversations/unread': {
    get: {
      tags: ['Messages'],
      summary: 'Unread totals for the message badge',
      description:
        'How many chats are unread, and how many messages that adds up to. Clients on the '
        + 'realtime socket refetch this after reconnecting instead of polling it.',
      responses: {
        200: ok('Your unread totals.', {
          type: 'object',
          properties: {
            unread: {
              type: 'object',
              properties: {
                conversations: { type: 'integer', example: 3 },
                messages: { type: 'integer', example: 11 },
              },
            },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/conversations/{id}': {
    parameters: [pathId('id', 'Conversation id.')],

    get: {
      tags: ['Messages'],
      summary: 'Get one chat',
      description: 'The chat header: title, picture, participants and your unread count.',
      responses: {
        200: ok('The chat.', {
          type: 'object',
          properties: { conversation: { $ref: '#/components/schemas/Conversation' } },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: notInChat,
      },
    },

    patch: {
      tags: ['Messages'],
      summary: 'Rename a group chat',
      description: 'Group chats only, admins only. A direct chat is named after the other person.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 75, example: 'Weekend football' },
            avatarUrl: { type: 'string' },
          },
        }),
      },
      responses: {
        200: conversationResponse('Chat updated.', 'Chat updated.'),
        400: ok('This is a direct chat, or the name is too long.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'That only applies to group chats.' }),
        401: { $ref: '#/components/responses/Unauthorized' },
        403: ok('You are not an admin of this chat.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'Only a chat admin can do that.' }),
        404: notInChat,
      },
    },

    delete: {
      tags: ['Messages'],
      summary: 'Delete a chat, for you only',
      description:
        'Hides the chat and everything said in it so far from your inbox. Everyone else '
        + 'keeps the thread, and the next message brings it back for you with only the new '
        + 'messages in it. To walk out of a group chat for good, use '
        + '`DELETE /conversations/{id}/participants`.',
      responses: {
        200: messageOnly('Chat deleted.', 'Chat deleted.'),
        401: { $ref: '#/components/responses/Unauthorized' },
        404: notInChat,
      },
    },
  },

  '/conversations/{id}/read': {
    parameters: [pathId('id', 'Conversation id.')],

    post: {
      tags: ['Messages'],
      summary: 'Mark a chat as read',
      description: 'Clears your unread count for this chat. Call it when the thread is opened.',
      responses: {
        200: ok('Marked as read.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Chat marked as read.' },
            lastReadAt: { type: 'string', format: 'date-time' },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
        404: notInChat,
      },
    },
  },

  '/conversations/{id}/messages': {
    parameters: [pathId('id', 'Conversation id.')],

    get: {
      tags: ['Messages'],
      summary: 'Read a thread',
      description:
        'Newest message first. To page backwards through the history, pass the `nextCursor` '
        + 'from the previous call as `before`; a null `nextCursor` means you have reached the '
        + 'start of the thread.\n\n'
        + 'New, edited and unsent messages are pushed over the `/ws` socket as `message:new` '
        + 'and `message:updated`, in this same shape. Call this again after reconnecting to '
        + 'pick up anything sent while the socket was down.',
      parameters: [
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 30, maximum: 100 } },
        {
          name: 'before',
          in: 'query',
          schema: { type: 'string' },
          description: 'A message id: return only messages older than it.',
        },
      ],
      responses: {
        200: ok('One page of the thread.', {
          type: 'object',
          properties: {
            messages: { type: 'array', items: { $ref: '#/components/schemas/Message' } },
            nextCursor: {
              type: 'string',
              nullable: true,
              description: 'Pass as `before` for the next page; null at the start of the thread.',
            },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
        404: notInChat,
      },
    },

    post: {
      tags: ['Messages'],
      summary: 'Send a message',
      description:
        'A message needs text, at least one attachment, or both. Attachments are the objects '
        + '`POST /upload` returns, passed straight through.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            text: { type: 'string', maxLength: 5000, example: 'On my way.' },
            attachments: {
              type: 'array',
              maxItems: 10,
              items: { $ref: '#/components/schemas/UploadedMedia' },
            },
            replyTo: {
              type: 'string',
              description: 'The id of a message in this same chat.',
            },
          },
        }),
      },
      responses: {
        201: ok('Message sent.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Message sent.' },
            data: { $ref: '#/components/schemas/Message' },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: notInChat,
      },
    },
  },

  '/conversations/{id}/messages/{messageId}': {
    parameters: [pathId('id', 'Conversation id.'), pathId('messageId', 'Message id.')],

    patch: {
      tags: ['Messages'],
      summary: 'Edit your message',
      description:
        'Your own messages only, only the text (attachments stay as they were sent), and '
        + 'only within **15 minutes** of sending. Past that the message is part of a shared '
        + 'record and the call answers 400. The reply carries `editedAt` so the client can '
        + 'mark it as edited.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['text'],
          properties: { text: { type: 'string', maxLength: 5000 } },
        }),
      },
      responses: {
        200: ok('Message updated.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Message updated.' },
            data: { $ref: '#/components/schemas/Message' },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: ok('Not your message.', { $ref: '#/components/schemas/Error' }, {
          message: 'You can only change your own messages.',
        }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },

    delete: {
      tags: ['Messages'],
      summary: 'Remove a message, for you or for everyone',
      description:
        'Two different acts behind one call, chosen with `scope`.\n\n'
        + '**`scope=me`** takes the message off your own thread and nobody else\'s. Any '
        + 'message qualifies, including one somebody else sent and one already unsent — '
        + 'hiding something from yourself takes nothing from anyone else, which is what '
        + 'stops one person clearing another\'s history. No time limit, and it cannot be '
        + 'undone.\n\n'
        + '**`scope=everyone`** (the default) unsends it. Your own messages only, and only '
        + 'within **15 minutes** of sending. The row stays as a tombstone — `deleted: true` '
        + 'with empty text — so the thread keeps its order and replies keep a target. Any '
        + 'photo or video is deleted from Cloudinary at the same time; if that provider call '
        + 'fails the message is still unsent and the failure is logged.',
      parameters: [
        {
          name: 'scope',
          in: 'query',
          schema: { type: 'string', enum: ['me', 'everyone'], default: 'everyone' },
          description: 'Whose thread it comes off.',
        },
      ],
      responses: {
        200: ok('Removed.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Message removed for everyone.' },
            scope: { type: 'string', enum: ['me', 'everyone'] },
          },
        }),
        400: ok('The 15-minute window has passed.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'You can only remove a message within 15 minutes of sending it.' }),
        401: { $ref: '#/components/responses/Unauthorized' },
        403: ok('Not your message — only for scope=everyone.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'You can only change your own messages.' }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/conversations/{id}/participants': {
    parameters: [pathId('id', 'Conversation id.')],

    get: {
      tags: ['Messages'],
      summary: 'List the people in a chat',
      responses: {
        200: ok('The participants.', {
          type: 'object',
          properties: {
            participants: {
              type: 'array',
              items: { $ref: '#/components/schemas/ConversationParticipant' },
            },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
        404: notInChat,
      },
    },

    post: {
      tags: ['Messages'],
      summary: 'Add people to a group chat',
      description:
        'Any member can add. A direct chat cannot grow — start a group chat instead. '
        + 'Anyone already in the chat is skipped.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['userIds'],
          properties: {
            userIds: { type: 'array', items: { type: 'string' } },
          },
        }),
      },
      responses: {
        201: ok('People added.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Added to the chat.' },
            added: { type: 'array', items: { type: 'string' } },
          },
        }),
        400: ok('This is a direct chat, or the chat is full.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'You cannot add people to a direct chat. Start a group chat instead.' }),
        401: { $ref: '#/components/responses/Unauthorized' },
        404: notInChat,
        409: ok('They are already in the chat.', { $ref: '#/components/schemas/Error' }, {
          message: 'They are already in this chat.',
        }),
      },
    },

    delete: {
      tags: ['Messages'],
      summary: 'Leave a group chat',
      description:
        'Group chats only. If you were the last admin, the longest-standing member takes over; '
        + 'if you were the last person, the chat and its messages are removed.',
      responses: {
        200: messageOnly('You left.', 'You left the chat.'),
        400: ok('This is a direct chat.', { $ref: '#/components/schemas/Error' }, {
          message: 'You cannot leave a direct chat. Delete it instead.',
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
        404: notInChat,
      },
    },
  },

  '/conversations/{id}/participants/{userId}': {
    parameters: [pathId('id', 'Conversation id.'), pathId('userId', 'The person to remove.')],

    delete: {
      tags: ['Messages'],
      summary: 'Remove someone from a group chat',
      description: 'Admins only. Use leave to remove yourself.',
      responses: {
        200: messageOnly('Removed.', 'Removed from the chat.'),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: ok('You are not an admin of this chat.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'Only a chat admin can do that.' }),
        404: notInChat,
      },
    },
  },
};
