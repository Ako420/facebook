export const securitySchemes = {
  bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
};

export const schemas = {
  Error: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Please correct the highlighted fields.' },
      errors: {
        type: 'object',
        additionalProperties: { type: 'string' },
        description: 'Present on validation failures: one message per field.',
        example: { email: 'Please provide a valid email address.' },
      },
    },
  },

  User: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '6a9b0a913991900fd2ec8357' },
      name: { type: 'string', example: 'Amara Nkeng' },
      email: { type: 'string', example: 'amara.nkeng@seed.local' },
      phone: { type: 'string', example: '6512340000' },
      avatarUrl: { type: 'string', example: 'https://res.cloudinary.com/demo/image/upload/a.jpg' },
      profileUrl: { type: 'string', description: 'Cover photo.' },
      work: { type: 'string', example: 'Product Designer at Lumen' },
      intro: { type: 'string', example: 'Building small things carefully.' },
      location: {
        type: 'object',
        properties: {
          city: { type: 'string', example: 'Douala' },
          country: { type: 'string', example: 'Cameroon' },
        },
      },
      friendsCount: { type: 'integer', example: 10 },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },

  AuthResponse: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Logged in successfully.' },
      token: { type: 'string', description: 'JWT, valid for JWT_EXPIRES_IN (7d by default).' },
      user: { $ref: '#/components/schemas/User' },
    },
  },

  Author: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string', example: 'Amara Nkeng' },
      avatarUrl: { type: 'string' },
    },
  },

  Person: {
    type: 'object',
    description: 'A trimmed user, used by friend lists and suggestions.',
    properties: {
      id: { type: 'string' },
      name: { type: 'string', example: 'Peter Sesay' },
      avatarUrl: { type: 'string' },
      work: { type: 'string' },
      friendsCount: { type: 'integer', example: 10 },
    },
  },

  Reactions: {
    type: 'object',
    description: "Tally of a post's reactions plus the reaction of the caller.",
    properties: {
      counts: {
        type: 'object',
        additionalProperties: { type: 'integer' },
        description: 'How many people picked each reaction type.',
        example: { 1: 3, 2: 1 },
      },
      total: { type: 'integer', example: 4 },
      viewerReaction: {
        type: 'integer',
        nullable: true,
        description: "The caller's own reaction, or null.",
        example: 1,
      },
    },
  },

  Post: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      type: { type: 'string', enum: ['post', 'reel'], example: 'post' },
      title: {
        type: 'string',
        description: 'The caption.',
        example: 'Small moments from a slow morning.',
      },
      description: { type: 'string' },
      imageUrl: { type: 'array', items: { type: 'string' } },
      videoUrl: { type: 'array', items: { type: 'string' } },
      likeCount: { type: 'integer', example: 4 },
      reactions: { $ref: '#/components/schemas/Reactions' },
      commentCount: { type: 'integer', example: 2 },
      groupId: {
        type: 'string',
        nullable: true,
        description: 'Set when the post belongs to a group; null for the main feed.',
      },
      createdAt: { type: 'string', format: 'date-time' },
      author: { $ref: '#/components/schemas/Author' },
    },
  },

  Comment: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      content: { type: 'string', example: 'Nice shot!' },
      createdAt: { type: 'string', format: 'date-time' },
      author: { $ref: '#/components/schemas/Author' },
    },
  },

  FriendEdge: {
    type: 'object',
    description: "One friendship row, seen from the caller's side.",
    properties: {
      id: { type: 'string', description: 'Friendship id — use this to accept or remove.' },
      status: { type: 'string', enum: ['pending', 'accepted', 'rejected'] },
      createdAt: { type: 'string', format: 'date-time' },
      user: { $ref: '#/components/schemas/Person' },
    },
  },

  FriendLists: {
    type: 'object',
    description: 'Your friendships split by what the UI does with each one.',
    properties: {
      friends: { type: 'array', items: { $ref: '#/components/schemas/FriendEdge' } },
      incoming: {
        type: 'array',
        description: 'Pending requests other people sent you.',
        items: { $ref: '#/components/schemas/FriendEdge' },
      },
      outgoing: {
        type: 'array',
        description: 'Pending requests you sent.',
        items: { $ref: '#/components/schemas/FriendEdge' },
      },
    },
  },

  Group: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string', example: 'Maidan Fanclub' },
      description: { type: 'string' },
      privacy: { type: 'string', enum: ['public', 'private'] },
      coverUrl: { type: 'string', description: 'From POST /upload.' },
      memberCount: { type: 'integer', example: 12 },
      createdAt: { type: 'string', format: 'date-time' },
      createdBy: {
        allOf: [{ $ref: '#/components/schemas/Person' }],
        nullable: true,
        description:
          'Null on a private group you are not in — the group is findable, but who '
          + 'is in it is not.',
      },
      viewerRole: {
        type: 'string',
        nullable: true,
        enum: ['admin', 'member', null],
        description: "The caller's role, or null when they are not a member.",
      },
      viewerStatus: {
        type: 'string',
        nullable: true,
        enum: ['active', 'invited', 'requested', null],
        description:
          'Where the caller stands with this group: in it, invited and yet to '
          + 'answer, waiting on an admin, or nothing at all.',
      },
      isMember: { type: 'boolean' },
      canRead: {
        type: 'boolean',
        description:
          'False for a private group you are not in: its posts and its member list '
          + 'answer 403. The fields above are still yours to render.',
      },
    },
  },

  GroupMember: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Membership id.' },
      role: { type: 'string', enum: ['admin', 'member'] },
      status: {
        type: 'string',
        enum: ['active', 'invited', 'requested'],
        description: 'In the group, asked in, or asking to come in.',
      },
      joinedAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the row was made — the invite or request date while pending.',
      },
      user: { $ref: '#/components/schemas/Person' },
      invitedBy: {
        allOf: [{ $ref: '#/components/schemas/Person' }],
        nullable: true,
        description: 'Who sent the invitation, on an invited row.',
      },
    },
  },

  GroupInvitation: {
    type: 'object',
    description: 'A group waiting on your answer.',
    properties: {
      group: { $ref: '#/components/schemas/Group' },
      invitedBy: { $ref: '#/components/schemas/Person' },
      invitedAt: { type: 'string', format: 'date-time' },
    },
  },

  ConversationParticipant: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Participation id.' },
      role: {
        type: 'string',
        enum: ['admin', 'member'],
        description: 'Only meaningful in a group chat.',
      },
      joinedAt: { type: 'string', format: 'date-time' },
      lastReadAt: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        description: 'How far this person has read — use it to show read receipts.',
      },
      user: { $ref: '#/components/schemas/Person' },
    },
  },

  Conversation: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      type: { type: 'string', enum: ['direct', 'group'] },
      title: {
        type: 'string',
        description:
          'What to show in the inbox: the group name, or the other person’s name in a '
          + 'direct chat.',
        example: 'Peter Sesay',
      },
      avatarUrl: {
        type: 'string',
        nullable: true,
        description: 'The group picture, or the other person’s avatar.',
      },
      name: { type: 'string', description: 'The stored group name; empty for direct chats.' },
      createdAt: { type: 'string', format: 'date-time' },
      lastMessageAt: {
        type: 'string',
        format: 'date-time',
        description: 'What the inbox is sorted by.',
      },
      lastMessage: {
        type: 'object',
        nullable: true,
        description: 'The preview line under the title.',
        properties: {
          id: { type: 'string' },
          preview: { type: 'string', example: 'On my way.' },
          sentAt: { type: 'string', format: 'date-time' },
          senderId: { type: 'string' },
          fromViewer: { type: 'boolean', description: 'True when you sent it.' },
        },
      },
      unreadCount: { type: 'integer', example: 2 },
      viewerRole: {
        type: 'string',
        nullable: true,
        enum: ['admin', 'member', null],
        description: 'Your role in a group chat.',
      },
      participants: {
        type: 'array',
        items: { $ref: '#/components/schemas/ConversationParticipant' },
      },
    },
  },

  Message: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      conversationId: { type: 'string' },
      text: { type: 'string', example: 'On my way.' },
      attachments: {
        type: 'array',
        items: { $ref: '#/components/schemas/UploadedMedia' },
      },
      replyTo: {
        type: 'string',
        nullable: true,
        description: 'The id of the message this one answers.',
      },
      createdAt: { type: 'string', format: 'date-time' },
      editedAt: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        description: 'Set once the sender edits it.',
      },
      deleted: {
        type: 'boolean',
        description:
          'True for an unsent message. It keeps its place in the thread with empty text, so '
          + 'the client can render "Message unsent".',
      },
      fromViewer: { type: 'boolean', description: 'True when you sent it.' },
      canEdit: {
        type: 'boolean',
        description:
          'Yours, still standing, and inside the 15-minute window. The client shows the '
          + 'Edit control on this rather than keeping its own clock.',
      },
      canUnsend: {
        type: 'boolean',
        description: 'The same rule, for Remove for everyone.',
      },
      sender: { $ref: '#/components/schemas/Author' },
    },
  },

  Story: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      type: {
        type: 'string',
        enum: ['image', 'video', 'text'],
        description: 'A text story carries no media and usually a background.',
      },
      text: {
        type: 'string',
        description: 'The caption on media, or the whole story without it.',
        example: 'Sunset over an empty stadium',
      },
      background: {
        type: 'string',
        nullable: true,
        description: 'Text stories only: a CSS background for the client to paint.',
      },
      media: {
        allOf: [{ $ref: '#/components/schemas/UploadedMedia' }],
        nullable: true,
      },
      createdAt: { type: 'string', format: 'date-time' },
      expiresAt: {
        type: 'string',
        format: 'date-time',
        description: '24 hours after it went up. Past this it stops being readable.',
      },
      seen: { type: 'boolean', description: 'Whether the caller has already watched it.' },
      viewCount: {
        type: 'integer',
        description: 'Your own stories only — absent on everyone else\'s.',
        example: 12,
      },
    },
  },

  StoryGroup: {
    type: 'object',
    description: 'One person\'s live stories, which is how the rail renders them.',
    properties: {
      author: { $ref: '#/components/schemas/Author' },
      isViewer: { type: 'boolean', description: 'True on your own group, which sorts first.' },
      hasUnseen: {
        type: 'boolean',
        description: 'What the highlighted ring in the rail keys off.',
      },
      latestAt: { type: 'string', format: 'date-time' },
      items: {
        type: 'array',
        description: 'Oldest first — the order they play in.',
        items: { $ref: '#/components/schemas/Story' },
      },
    },
  },

  Notification: {
    type: 'object',
    description:
      'Something that happened to you. The client words it from `type`; `post`, `comment` '
      + 'and `group` are filled in for the types that have one, and are null when that thing '
      + 'has since been deleted.',
    properties: {
      id: { type: 'string' },
      type: {
        type: 'string',
        enum: ['friend-request', 'friend-accepted', 'comment', 'reaction', 'group-invite'],
      },
      actor: { $ref: '#/components/schemas/Author' },
      post: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['post', 'reel'] },
          groupId: { type: 'string', nullable: true },
        },
      },
      comment: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'string' },
          preview: { type: 'string', example: 'Great shot!' },
        },
      },
      group: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Weekend football' },
        },
      },
      createdAt: { type: 'string', format: 'date-time' },
      readAt: { type: 'string', format: 'date-time', nullable: true },
      isRead: { type: 'boolean' },
    },
  },

  UploadedMedia: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['image', 'video'] },
      url: { type: 'string', example: 'https://res.cloudinary.com/demo/image/upload/v1/a.jpg' },
      publicId: { type: 'string' },
      width: { type: 'integer' },
      height: { type: 'integer' },
      poster: { type: 'string', description: 'Video only: a still frame.' },
      durationSec: { type: 'number', description: 'Video only.' },
    },
  },
};

const errorResponse = (description, example) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      ...(example ? { example } : {}),
    },
  },
});

export const responses = {
  Unauthorized: errorResponse('Missing, expired or rejected token.', {
    message: 'Please log in to continue.',
  }),
  Forbidden: errorResponse('Signed in, but not allowed to touch this resource.', {
    message: 'You can only edit your own posts.',
  }),
  NotFound: errorResponse('No such record.', { message: 'Post not found' }),
  ValidationError: errorResponse('The body failed validation.'),
  Conflict: errorResponse('The record already exists.', {
    message: 'Email already exists.',
  }),
  RateLimited: errorResponse(
    'Too many requests. /api/auth/* allows 20 per 15 minutes, everything else 500.',
    { message: 'Too many requests from this IP, please try again after 15 minutes.' },
  ),
};
