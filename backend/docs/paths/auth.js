import { json, ok } from '../helpers.js';

export const authPaths = {
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Create an account',
      description:
        'Creates the account and signs you in straight away. '
        + 'Phone is stored as a string, so a leading zero is kept.',
      security: [],
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['name', 'email', 'phone', 'gender', 'dateOfBirth', 'password', 'confirmPassword'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 60, example: 'Amara Nkeng' },
            email: { type: 'string', format: 'email', example: 'amara@example.com' },
            phone: { type: 'string', minLength: 10, maxLength: 15, example: '0651234567' },
            gender: { type: 'string', enum: ['male', 'female', 'other'] },
            dateOfBirth: { type: 'string', format: 'date', example: '1999-03-14' },
            password: { type: 'string', minLength: 6, example: 'secret123' },
            confirmPassword: { type: 'string', example: 'secret123' },
          },
        }),
      },
      responses: {
        201: ok('Account created.', { $ref: '#/components/schemas/AuthResponse' }),
        400: { $ref: '#/components/responses/ValidationError' },
        409: { $ref: '#/components/responses/Conflict' },
        429: { $ref: '#/components/responses/RateLimited' },
      },
    },
  },

  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Sign in',
      security: [],
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'amara.nkeng@seed.local' },
            password: { type: 'string', example: 'password123' },
          },
        }),
      },
      responses: {
        200: ok('Signed in.', { $ref: '#/components/schemas/AuthResponse' }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: ok('Wrong email or password.', { $ref: '#/components/schemas/Error' }, {
          message: 'Invalid email or password.',
        }),
        403: ok('The account is deactivated.', { $ref: '#/components/schemas/Error' }, {
          message: 'This account has been deactivated. Contact support to restore it.',
        }),
        429: { $ref: '#/components/responses/RateLimited' },
      },
    },
  },

  '/auth/user': {
    get: {
      tags: ['Auth'],
      summary: 'Get the signed-in account',
      responses: {
        200: ok('The current user.', {
          type: 'object',
          properties: { user: { $ref: '#/components/schemas/User' } },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },

    patch: {
      tags: ['Auth'],
      summary: 'Update your profile',
      description:
        'Every field is optional — send only what changes. '
        + '`work` must be 5-100 characters, so it cannot be cleared to an empty string.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 60 },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', minLength: 10, maxLength: 15 },
            intro: { type: 'string', maxLength: 200 },
            work: { type: 'string', minLength: 5, maxLength: 100 },
            avatarUrl: { type: 'string', description: 'A URL from POST /upload.' },
            profileUrl: { type: 'string', description: 'Cover photo URL from POST /upload.' },
            location: {
              type: 'object',
              properties: {
                city: { type: 'string', minLength: 2, maxLength: 50 },
                country: { type: 'string', minLength: 2, maxLength: 50 },
              },
            },
          },
        }),
      },
      responses: {
        200: ok('Profile updated.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Profile updated.' },
            user: { $ref: '#/components/schemas/User' },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        409: { $ref: '#/components/responses/Conflict' },
      },
    },

    delete: {
      tags: ['Auth'],
      summary: 'Deactivate your account',
      description:
        'A soft delete: the row stays in the database with status "inactive". '
        + 'Login and every existing token stop working immediately. Posts are kept.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['password'],
          properties: { password: { type: 'string', description: 'Confirms it is really you.' } },
        }),
      },
      responses: {
        200: ok('Account deactivated.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Your account has been deactivated.' },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/auth/user/{id}': {
    get: {
      tags: ['Auth'],
      summary: "Get someone else's public profile",
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'User id (24-character hex).',
        },
      ],
      responses: {
        200: ok('That user.', {
          type: 'object',
          properties: { user: { $ref: '#/components/schemas/User' } },
        }),
        400: ok('The id is not a valid ObjectId.', { $ref: '#/components/schemas/Error' }, {
          message: 'Invalid user id.',
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
        404: ok('No such user, or the account is deactivated.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'User not found.' }),
      },
    },
  },

  '/auth/password': {
    put: {
      tags: ['Auth'],
      summary: 'Change your password',
      description:
        'Signs you out everywhere else: every token issued before the change stops working, '
        + 'over REST and on open sockets. The response carries a fresh token for this session.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['currentPassword', 'newPassword', 'confirmNewPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 6 },
            confirmNewPassword: { type: 'string' },
          },
        }),
      },
      responses: {
        200: ok('Password changed.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Password changed successfully.' },
            token: { type: 'string', description: 'Replaces the token you sent.' },
            user: { $ref: '#/components/schemas/User' },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
};
