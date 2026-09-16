import { json, messageOnly, ok, pathId } from '../helpers.js';

const groupResponse = (description, message) =>
  ok(description, {
    type: 'object',
    properties: {
      message: { type: 'string', example: message },
      group: { $ref: '#/components/schemas/Group' },
    },
  });

export const groupPaths = {
  '/groups': {
    get: {
      tags: ['Groups'],
      summary: 'Discover groups, or list your own',
      description:
        'By default returns groups you are **not** in, busiest first. Private groups '
        + 'appear too: you cannot read one, but you have to be able to find it before '
        + 'you can ask to join, so each carries `canRead: false` and a `viewerStatus` '
        + 'of `"requested"` once you have asked.\n\n'
        + 'Groups that have invited you are left out; they are under '
        + '`GET /groups/invitations`. Pass `mine=true` for the groups you belong to.',
      parameters: [
        {
          name: 'mine',
          in: 'query',
          schema: { type: 'boolean', default: false },
          description: 'true returns your groups instead of suggestions.',
        },
        {
          name: 'q',
          in: 'query',
          schema: { type: 'string' },
          description: 'Filter suggestions by name (case-insensitive).',
        },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 50 } },
      ],
      responses: {
        200: ok('Matching groups.', {
          type: 'object',
          properties: {
            groups: { type: 'array', items: { $ref: '#/components/schemas/Group' } },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },

    post: {
      tags: ['Groups'],
      summary: 'Create a group',
      description: 'You become its first member, with the admin role.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 3, maxLength: 75, example: 'Maidan Fanclub' },
            description: { type: 'string', maxLength: 500 },
            privacy: { type: 'string', enum: ['public', 'private'], default: 'public' },
            coverUrl: { type: 'string', description: 'A URL from POST /upload.' },
          },
        }),
      },
      responses: {
        201: groupResponse('Group created.', 'Group created.'),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/groups/{id}': {
    parameters: [pathId('id', 'Group id.')],

    get: {
      tags: ['Groups'],
      summary: 'Get one group',
      description:
        'Anyone signed in can read a group card: name, cover, description and member '
        + 'count. On a private group you are not in, `canRead` is false and `createdBy` '
        + 'is null, its posts and member list are closed, and `viewerStatus` says whether '
        + 'you have already asked to join.',
      responses: {
        200: ok('The group.', {
          type: 'object',
          properties: { group: { $ref: '#/components/schemas/Group' } },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },

    patch: {
      tags: ['Groups'],
      summary: 'Edit a group',
      description:
        'Admins only. Switching a private group to **public** lets everyone with a '
        + 'pending join request in at the same time — the only thing their request was '
        + 'waiting on was the group being private.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 3, maxLength: 75 },
            description: { type: 'string', maxLength: 500 },
            privacy: { type: 'string', enum: ['public', 'private'] },
            coverUrl: { type: 'string' },
          },
        }),
      },
      responses: {
        200: groupResponse('Group updated.', 'Group updated.'),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: ok('You are not an admin of this group.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'Only a group admin can do that.' }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },

    delete: {
      tags: ['Groups'],
      summary: 'Delete a group',
      description:
        'Admins only. Removes the group, every membership and every post in it, along '
        + 'with any photos and videos those posts carried on Cloudinary.',
      responses: {
        200: messageOnly('Group deleted.', 'Group deleted.'),
        401: { $ref: '#/components/responses/Unauthorized' },
        403: ok('You are not an admin of this group.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'Only a group admin can do that.' }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/groups/{id}/members': {
    parameters: [pathId('id', 'Group id.')],

    get: {
      tags: ['Groups'],
      summary: 'List the members, the invitations or the requests',
      description:
        'Admins first. The member list of a private group is members-only.\n\n'
        + '`status=invited` returns people who have been asked in and have not answered, '
        + 'which any member may look at. `status=requested` returns the join requests '
        + 'waiting on an admin, and only an admin may look at those.',
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['active', 'invited', 'requested'], default: 'active' },
          description: 'Which rows to return.',
        },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
      ],
      responses: {
        200: ok('The members.', {
          type: 'object',
          properties: {
            members: { type: 'array', items: { $ref: '#/components/schemas/GroupMember' } },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },

    post: {
      tags: ['Groups'],
      summary: 'Join a group, or ask to join a private one',
      description:
        'A public group lets you straight in. A private one files a request for its '
        + 'admins to answer. If the group had already invited you, this accepts that '
        + 'invitation, and a request left over from when a now-public group was private '
        + 'is simply let in. Read `status` in the reply to know which happened.\n\n'
        + 'Two joins for the same person at once cannot both succeed — the database keeps '
        + 'one and the other answers 409.',
      responses: {
        201: ok('You are in, or your request was filed.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'You joined the group.' },
            status: {
              type: 'string',
              enum: ['active', 'requested'],
              description:
                'active means you are in; requested means an admin has to answer.',
            },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        409: ok('You are already in, or have already asked.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'You have already asked to join this group.' }),
      },
    },

    delete: {
      tags: ['Groups'],
      summary: 'Leave a group',
      description:
        'The only remaining admin cannot leave — promote someone else or delete the group.',
      responses: {
        200: messageOnly('You left.', 'You left the group.'),
        400: ok('You are the last admin.', { $ref: '#/components/schemas/Error' }, {
          message: 'You are the only admin. Make someone else an admin, or delete the group.',
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/groups/invitations': {
    get: {
      tags: ['Groups'],
      summary: 'Groups waiting on your answer',
      description:
        'Invitations other people have sent you, newest first. Accept one with '
        + '`PATCH /groups/{id}/members/{yourId}`, turn it down with `DELETE` on the '
        + 'same path.',
      responses: {
        200: ok('Your invitations.', {
          type: 'object',
          properties: {
            invitations: {
              type: 'array',
              items: { $ref: '#/components/schemas/GroupInvitation' },
            },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/groups/{id}/invites': {
    parameters: [pathId('id', 'Group id.')],

    post: {
      tags: ['Groups'],
      summary: 'Invite people into a group',
      description:
        'Any member can ask people in, and this is the only way into a private group '
        + 'besides a request. Nobody is added by it: each person gets an invitation to '
        + 'accept or turn down. Anyone already in, or already invited, is skipped.\n\n'
        + 'Someone who has already **asked** to join is a different case, because '
        + 'answering a request is an admin\'s decision. An admin inviting them lets them '
        + 'straight in (`approved`). A plain member inviting them does not — they are '
        + 'skipped and listed in `awaitingAdmin`, so a member cannot use an invitation to '
        + 'get around admin approval.',
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
        201: ok('Invitations sent.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Invitations sent.' },
            invited: {
              type: 'array',
              items: { type: 'string' },
              description: 'Who was invited.',
            },
            approved: {
              type: 'array',
              items: { type: 'string' },
              description: 'Had already asked to join and went straight in. Admins only.',
            },
            awaitingAdmin: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Had already asked to join, but the caller is not an admin, so their '
                + 'request is left for an admin to answer.',
            },
          },
        }),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: ok('You are not in this group.', { $ref: '#/components/schemas/Error' }, {
          message: 'Only members of this group can do that.',
        }),
        404: { $ref: '#/components/responses/NotFound' },
        409: ok('Nothing left to do.', { $ref: '#/components/schemas/Error' }, {
          message: 'They are already in this group, or already invited.',
        }),
      },
    },
  },

  '/groups/{id}/members/{userId}/role': {
    parameters: [pathId('id', 'Group id.'), pathId('userId', 'The member whose role changes.')],

    put: {
      tags: ['Groups'],
      summary: 'Make someone an admin, or take it back',
      description:
        'Admins only, and only on people who are actually in the group. Two people can '
        + 'never lose the role: the creator, and whoever is the last admin left — a group '
        + 'with no admin can no longer be edited or cleaned up. That is also how the only '
        + 'admin gets out: make someone else an admin first, then leave.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['role'],
          properties: { role: { type: 'string', enum: ['admin', 'member'] } },
        }),
      },
      responses: {
        200: ok('Role changed.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'They are now an admin.' },
            role: { type: 'string', enum: ['admin', 'member'] },
          },
        }),
        400: ok('Unknown role, or this is the last admin.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'A group needs at least one admin. Make someone else an admin first.' }),
        401: { $ref: '#/components/responses/Unauthorized' },
        403: ok('You are not an admin, or the target is the creator.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'The group creator is always an admin.' }),
        404: ok('Not in this group.', { $ref: '#/components/schemas/Error' }, {
          message: 'That person is not in this group.',
        }),
        409: ok('They already have that role.', { $ref: '#/components/schemas/Error' }, {
          message: 'They are already an admin.',
        }),
      },
    },
  },

  '/groups/{id}/members/{userId}': {
    parameters: [pathId('id', 'Group id.'), pathId('userId', 'The member to remove.')],

    patch: {
      tags: ['Groups'],
      summary: 'Accept an invitation, or approve a join request',
      description:
        'Both end in the same place, so one call covers them and who you are decides '
        + 'which it is: pass your **own** id to accept an invitation the group sent you, '
        + 'or somebody else id, as an admin, to let their request in.',
      responses: {
        200: ok('They are in.', {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'You joined the group.' },
            status: { type: 'string', example: 'active' },
          },
        }),
        401: { $ref: '#/components/responses/Unauthorized' },
        403: ok('Not your invitation, or you are not an admin.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'Only the person invited can accept an invitation.' }),
        404: ok('Nothing to answer.', { $ref: '#/components/schemas/Error' }, {
          message: 'There is nothing to answer here.',
        }),
        409: ok('Already in the group.', { $ref: '#/components/schemas/Error' }, {
          message: 'That person is already in this group.',
        }),
      },
    },

    delete: {
      tags: ['Groups'],
      summary: 'Remove a member, or take away an invitation or a request',
      description:
        'One delete covers every kind of row, and who you are decides what it means:\n\n'
        + '- an **admin** removes a member, declines a join request, or withdraws an '
        + 'invitation;\n'
        + '- a **member** withdraws an invitation;\n'
        + '- **you** turn down an invitation addressed to you, or take back your own '
        + 'request, by passing your own id.\n\n'
        + 'The creator cannot be removed, and a member cannot remove themselves. That is '
        + 'what leaving is for.',
      responses: {
        200: messageOnly('Removed.', 'Member removed.'),
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: ok('Not an admin, or the target is the creator.', {
          $ref: '#/components/schemas/Error',
        }, { message: 'The group creator cannot be removed.' }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
