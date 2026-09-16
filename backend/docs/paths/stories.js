import { json, messageOnly, ok, pathId } from '../helpers.js';

const gone = ok(
  'Expired, deleted, or posted by someone whose stories you do not see — all three '
  + 'answer the same way, so a story you are not meant to know about stays unknown.',
  { $ref: '#/components/schemas/Error' },
  { message: 'That story is no longer available.' },
);

export const storyPaths = {
  '/stories': {
    get: {
      tags: ['Stories'],
      summary: 'The story rail',
      description:
        'Live stories from you and your friends, grouped by the person who posted them '
        + 'and ordered the way the rail reads: you first, then anyone with something you '
        + 'have not seen, then the rest by recency. Inside a group the stories run '
        + 'oldest to newest, which is the order they play in.\n\n'
        + '`viewCount` appears only on your own stories — how many people watched is the '
        + 'author\'s business.',
      responses: {
        200: ok('The rail.', {
          type: 'object',
          properties: {
            stories: {
              type: 'array',
              items: { $ref: '#/components/schemas/StoryGroup' },
            },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },

    post: {
      tags: ['Stories'],
      summary: 'Post a story',
      description:
        'Either a picture or video — pass the descriptor `POST /upload` returned — or a '
        + 'text story with an optional background. A caption may ride along with media. '
        + 'Every story lapses 24 hours after it goes up.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            media: {
              allOf: [{ $ref: '#/components/schemas/UploadedMedia' }],
              description: 'Leave this out for a text story.',
            },
            text: {
              type: 'string',
              maxLength: 250,
              description: 'The caption on media, or the whole story without it.',
              example: 'Sunset over an empty stadium',
            },
            background: {
              type: 'string',
              maxLength: 120,
              description: 'Text stories only: any CSS background the client understands.',
              example: 'linear-gradient(135deg, #1877f2, #0b5cbf)',
            },
          },
        }),
      },
      responses: {
        201: ok('Story shared.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Story shared.' },
            story: { $ref: '#/components/schemas/Story' },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/stories/mine': {
    get: {
      tags: ['Stories'],
      summary: 'Your own live stories',
      description: 'Newest first, each with the number of people who have watched it.',
      responses: {
        200: ok('Your stories.', {
          type: 'object',
          properties: {
            stories: { type: 'array', items: { $ref: '#/components/schemas/Story' } },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/stories/{id}/views': {
    parameters: [pathId('id', 'Story id.')],

    post: {
      tags: ['Stories'],
      summary: 'Mark a story as seen',
      description:
        'Call it when the story opens. One view per person however many times they come '
        + 'back, and looking at your own story never counts — the number is meant to say '
        + 'how many other people watched.',
      responses: {
        200: ok('Recorded, or already recorded.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Marked as seen.' },
            counted: {
              type: 'boolean',
              description: 'False when this was a repeat look, or your own story.',
            },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: gone,
      },
    },

    get: {
      tags: ['Stories'],
      summary: 'Who watched your story',
      description: 'Newest first. Only the person who posted it may ask.',
      parameters: [
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
      ],
      responses: {
        200: ok('The viewers.', {
          type: 'object',
          properties: {
            viewCount: { type: 'integer', example: 12 },
            viewers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  seenAt: { type: 'string', format: 'date-time' },
                  user: { $ref: '#/components/schemas/Author' },
                },
              },
            },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
        403: ok('Not your story.', { $ref: '#/components/schemas/Error' }, {
          message: 'Only the person who posted a story can see who watched it.',
        }),
        404: gone,
      },
    },
  },

  '/stories/{id}': {
    parameters: [pathId('id', 'Story id.')],

    delete: {
      tags: ['Stories'],
      summary: 'Delete your story',
      description:
        'Takes the story, its view rows and its picture on Cloudinary. Your own only.',
      responses: {
        200: messageOnly('Story deleted.', 'Story deleted.'),
        401: { $ref: '#/components/responses/Unauthorized' },
        403: ok('Not your story.', { $ref: '#/components/schemas/Error' }, {
          message: 'You can only delete your own stories.',
        }),
        404: gone,
      },
    },
  },
};
