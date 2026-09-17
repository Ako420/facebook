import { json, messageOnly, ok, pathId } from '../helpers.js';

const reactionResponse = (description) =>
  ok(description, {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Reaction saved.' },
      reactions: { $ref: '#/components/schemas/Reactions' },
    },
  });

export const postPaths = {
  '/posts': {
    get: {
      tags: ['Posts'],
      summary: 'List posts or reels',
      description:
        'Newest first, except that anything you have already seen moves to the back, the '
        + 'one you saw longest ago first. So a reload brings posts you have not seen yet, and '
        + 'once you have seen everything the feed repeats instead of running dry.\n\n'
        + 'Tell the server what has been seen with POST /posts/views. A reel is a post with '
        + 'type "reel", so the same endpoint serves both feeds.',
      parameters: [
        {
          name: 'type',
          in: 'query',
          schema: { type: 'string', enum: ['post', 'reel'], default: 'post' },
          description: 'Anything other than "reel" returns posts.',
        },
        {
          name: 'userId',
          in: 'query',
          schema: { type: 'string' },
          description: 'Only this author. Used by the profile page.',
        },
        {
          name: 'groupId',
          in: 'query',
          schema: { type: 'string' },
          description:
            "A group's feed. Omit it for the main feed, which excludes group posts. "
            + 'A private group is members-only.',
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 20, maximum: 50 },
        },
      ],
      responses: {
        200: ok('Matching posts.', {
          type: 'object',
          properties: {
            posts: { type: 'array', items: { $ref: '#/components/schemas/Post' } },
            caughtUp: {
              type: 'boolean',
              description: 'True once the page contains posts you have already seen.',
            },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },

    post: {
      tags: ['Posts'],
      summary: 'Publish a post or reel',
      description:
        'Upload media first with POST /upload, then send the URLs it returns. '
        + 'A reel needs exactly one video; a post needs text or at least one file.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['post', 'reel'], default: 'post' },
            title: { type: 'string', description: 'The caption.', example: 'Sunday reset.' },
            description: { type: 'string' },
            imageUrl: {
              type: 'array',
              items: { type: 'string' },
              description: 'Ignored for a reel.',
            },
            videoUrl: { type: 'array', items: { type: 'string' } },
            groupId: {
              type: 'string',
              description: 'Posts into a group. You have to be a member of it.',
            },
          },
        }),
      },
      responses: {
        201: ok('Post published.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Post published.' },
            post: { $ref: '#/components/schemas/Post' },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/posts/views': {
    post: {
      tags: ['Posts'],
      summary: 'Mark posts as seen',
      description:
        'Send the ids of posts or reels that have been in front of the viewer, at most 50 at '
        + 'a time. Sending the same id twice is harmless. Seen posts sink to the bottom of the '
        + 'next feed load.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['postIds'],
          properties: {
            postIds: { type: 'array', maxItems: 50, items: { type: 'string' } },
          },
        }),
      },
      responses: {
        200: ok('Recorded.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Marked as seen.' },
            added: { type: 'integer', description: 'How many were new.', example: 3 },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/posts/{id}': {
    get: {
      tags: ['Posts'],
      summary: 'Read one post or reel',
      description:
        'What a notification links to. A post in a private group is only returned to its '
        + 'members.',
      parameters: [pathId('id', 'The post id.')],
      responses: {
        200: ok('The post.', {
          type: 'object',
          properties: { post: { $ref: '#/components/schemas/Post' } },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },

    patch: {
      tags: ['Posts'],
      summary: 'Edit your own post or reel',
      description:
        'Text only — media cannot be swapped after publishing. '
        + 'An edit that would leave the post with no text and no media is rejected.',
      parameters: [pathId('id', 'Post id.')],
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            title: { type: 'string', example: 'An edited caption' },
            description: { type: 'string' },
          },
        }),
      },
      responses: {
        200: ok('Post updated.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Post updated.' },
            post: { $ref: '#/components/schemas/Post' },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },

    delete: {
      tags: ['Posts'],
      summary: 'Delete your own post or reel',
      description:
        'Any photo or video on it is deleted from Cloudinary at the same time, so the '
        + 'file stops being served rather than living on at its URL. Media that did not '
        + 'come from this account is left alone. A provider failure is logged and does '
        + 'not undo the delete.',
      parameters: [pathId('id', 'Post id.')],
      responses: {
        200: messageOnly('Post deleted.', 'Post deleted.'),
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/posts/{postId}/reaction': {
    put: {
      tags: ['Reactions'],
      summary: 'React, or change your reaction',
      description:
        'One reaction per person per post, so calling this again replaces the previous one '
        + 'rather than adding another. likeCount mirrors how many people reacted.',
      parameters: [pathId('postId', 'Post id.')],
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['type'],
          properties: {
            type: {
              type: 'integer',
              minimum: 1,
              maximum: 10,
              example: 1,
              description:
                'The client maps names to numbers: 1 like, 2 love, 3 care, 4 haha, 5 wow, 6 sad, 7 angry.',
            },
          },
        }),
      },
      responses: {
        200: reactionResponse('Reaction saved.'),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },

    delete: {
      tags: ['Reactions'],
      summary: 'Take your reaction back',
      parameters: [pathId('postId', 'Post id.')],
      responses: {
        200: reactionResponse('Reaction removed.'),
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
