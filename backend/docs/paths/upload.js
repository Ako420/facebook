import { json, ok } from '../helpers.js';

export const uploadPaths = {
  '/upload': {
    post: {
      tags: ['Upload'],
      summary: 'Send images and videos to Cloudinary',
      description:
        'Multipart form data under the field name `media`, up to 6 files at once. '
        + 'Images must be under 10MB, videos under 100MB. '
        + 'Nothing is written to the server disk — the files are streamed straight through. '
        + 'Use the URLs it returns when creating a post, a reel, an avatar or a cover photo.',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['media'],
              properties: {
                media: {
                  type: 'array',
                  maxItems: 6,
                  items: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
      },
      responses: {
        201: ok('Upload complete.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Upload complete.' },
            media: {
              type: 'array',
              items: { $ref: '#/components/schemas/UploadedMedia' },
            },
          },
        }),
        400: ok('Wrong file type, too many files, or a file over the size cap.', {
          $ref: '#/components/schemas/Error',
        }, {
          message: 'clip.txt is not an image or video.',
          errors: { media: 'Only image and video files can be uploaded.' },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
        502: ok('Cloudinary rejected the file.', { $ref: '#/components/schemas/Error' }),
        503: ok('Cloudinary credentials are missing from .env.', {
          $ref: '#/components/schemas/Error',
        }),
      },
    },

    delete: {
      tags: ['Upload'],
      summary: 'Throw away files that were uploaded but never used',
      description:
        'For the case where the upload succeeded and the post did not: the composer '
        + 'failed at the publish step and the user gave up. Without this the files sit '
        + 'on Cloudinary with nothing pointing at them.\n\n'
        + 'Three things must hold before anything is deleted, and the endpoint simply '
        + 'skips whatever fails them:\n\n'
        + '1. **you uploaded it** — every upload is recorded against the account that '
        + 'made it, so one person can never reach another\'s media;\n'
        + '2. **nothing has claimed it** — publishing a post or sending a message marks '
        + 'its files as in use;\n'
        + '3. **no post or message references it** — checked directly, so a stale or '
        + 'replayed id cannot take down live media.\n\n'
        + 'The reply says how many were removed rather than failing on the ones that '
        + 'were not, so a client can fire it and forget it.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['publicIds'],
          properties: {
            publicIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'The `publicId` values POST /upload returned.',
              example: ['facebook/ab12cd34'],
            },
          },
        }),
      },
      responses: {
        200: ok('However many qualified were removed.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Unused uploads discarded.' },
            discarded: { type: 'integer', example: 1 },
            skipped: {
              type: 'integer',
              description: 'Not yours, already claimed, or still referenced.',
              example: 0,
            },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
};
