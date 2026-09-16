import { json, messageOnly, ok, pathId } from '../helpers.js';

/**
 * The router mounts GET and POST on /:postId and DELETE on /:commentId.
 * OpenAPI ignores the parameter name when matching paths, so both are the same
 * template and have to share one entry — the id means a post for GET and POST,
 * and a comment for DELETE.
 */
export const commentPaths = {
  '/comment/{id}': {
    parameters: [pathId('id', 'A post id for GET and POST, a comment id for DELETE.')],

    get: {
      tags: ['Comments'],
      summary: 'List the comments on a post or reel',
      description:
        '`id` is the **post** id. Oldest first. A post with no comments returns an empty '
        + 'array, not a 404.',
      responses: {
        200: ok('The comments.', {
          type: 'object',
          properties: {
            comments: { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },

    post: {
      tags: ['Comments'],
      summary: 'Add a comment',
      description: "`id` is the **post** id. Also bumps the post's commentCount.",
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['commentText'],
          properties: { commentText: { type: 'string', example: 'Nice shot!' } },
        }),
      },
      responses: {
        201: ok('Comment created.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Comment created successfully' },
            comment: { $ref: '#/components/schemas/Comment' },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },

    delete: {
      tags: ['Comments'],
      summary: 'Delete your own comment',
      description:
        '`id` is the **comment** id. Only the author may delete, and the post\'s '
        + 'commentCount goes back down.',
      responses: {
        200: messageOnly('Comment deleted.', 'Comment deleted successfully'),
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
