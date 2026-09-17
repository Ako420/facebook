import {
  addParticipantsService,
  clearConversationService,
  createGroupChatService,
  getConversationService,
  leaveConversationService,
  listConversationsService,
  listParticipantsService,
  markReadService,
  removeParticipantService,
  startDirectService,
  unreadSummaryService,
  updateConversationService,
} from '../service/conversationService.js';

const same = (a, b) => String(a) === String(b);

const publicPerson = (user) =>
  user && typeof user === 'object'
    ? {
        id: user._id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        work: user.work,
        friendsCount: user.friendsCount ?? 0,
      }
    : { id: user };

const publicParticipant = (row) => ({
  id: row._id,
  role: row.role,
  joinedAt: row.createdAt,
  lastReadAt: row.lastReadAt ?? null,
  lastDeliveredAt: row.lastDeliveredAt ?? null,
  user: publicPerson(row.userId),
});


const displayFor = (conversation, participants, viewerId) => {
  if (conversation.type === 'group') {
    return {
      title: conversation.name || 'Group chat',
      avatarUrl: conversation.avatarUrl ?? null,
    };
  }

  const other = participants.find((row) => !same(row.userId?._id ?? row.userId, viewerId));

  return {
    title: other?.userId?.name ?? 'Facebook user',
    avatarUrl: other?.userId?.avatarUrl ?? null,
  };
};

const publicConversation = (conversation, participants, membership, viewerId) => {
  const { title, avatarUrl } = displayFor(conversation, participants, viewerId);

  return {
    id: conversation._id,
    type: conversation.type,
    title,
    avatarUrl,
    name: conversation.name ?? '',
    createdAt: conversation.createdAt,
    lastMessageAt: conversation.lastMessageAt,
    lastMessage: conversation.lastMessage
      ? {
          id: conversation.lastMessage.messageId,
          preview: conversation.lastMessage.preview ?? '',
          sentAt: conversation.lastMessage.sentAt,
          senderId: conversation.lastMessage.senderId,
          fromViewer: same(conversation.lastMessage.senderId, viewerId),
        }
      : null,
    unreadCount: membership?.unreadCount ?? 0,
    viewerRole: membership?.role ?? null,
    participants: participants.map(publicParticipant),
  };
};

/** GET /api/conversations */
export const listConversations = async (req, res, next) => {
  try {
    const rows = await listConversationsService(req.user._id, { limit: req.query.limit });

    return res.status(200).json({
      conversations: rows.map(({ conversation, participants, membership }) =>
        publicConversation(conversation, participants, membership, req.user._id),
      ),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/conversations
 * `{ userId }` opens a direct chat, `{ type: "group", participantIds }` starts
 * a group one. Opening a direct chat twice returns the same thread.
 */
export const startConversation = async (req, res, next) => {
  try {
    if (req.body?.type === 'group') {
      const conversation = await createGroupChatService(req.user._id, req.body);
      const { participants, membership } = await getConversationService(
        conversation._id,
        req.user._id,
      );

      return res.status(201).json({
        message: 'Group chat created.',
        conversation: publicConversation(
          conversation.toObject(),
          participants,
          membership,
          req.user._id,
        ),
      });
    }

    const { conversation, created } = await startDirectService(
      req.user._id,
      req.body?.userId,
    );
    const { participants, membership } = await getConversationService(
      conversation._id,
      req.user._id,
    );

    return res.status(created ? 201 : 200).json({
      message: created ? 'Chat started.' : 'Chat opened.',
      conversation: publicConversation(
        conversation.toObject(),
        participants,
        membership,
        req.user._id,
      ),
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/conversations/unread */
export const getUnreadSummary = async (req, res, next) => {
  try {
    const unread = await unreadSummaryService(req.user._id);

    return res.status(200).json({ unread });
  } catch (error) {
    next(error);
  }
};

/** GET /api/conversations/:id */
export const getConversation = async (req, res, next) => {
  try {
    const { conversation, participants, membership } = await getConversationService(
      req.params.id,
      req.user._id,
    );

    return res.status(200).json({
      conversation: publicConversation(conversation, participants, membership, req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/conversations/:id */
export const editConversation = async (req, res, next) => {
  try {
    const updated = await updateConversationService(req.params.id, req.user._id, req.body);
    const { participants, membership } = await getConversationService(
      updated._id,
      req.user._id,
    );

    return res.status(200).json({
      message: 'Chat updated.',
      conversation: publicConversation(
        updated.toObject(),
        participants,
        membership,
        req.user._id,
      ),
    });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/conversations/:id */
export const deleteConversation = async (req, res, next) => {
  try {
    await clearConversationService(req.params.id, req.user._id);

    return res.status(200).json({ message: 'Chat deleted.' });
  } catch (error) {
    next(error);
  }
};

/** POST /api/conversations/:id/read */
export const markConversationRead = async (req, res, next) => {
  try {
    const membership = await markReadService(req.params.id, req.user._id);

    return res.status(200).json({
      message: 'Chat marked as read.',
      lastReadAt: membership.lastReadAt,
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/conversations/:id/participants */
export const listParticipants = async (req, res, next) => {
  try {
    const rows = await listParticipantsService(req.params.id, req.user._id);

    return res.status(200).json({ participants: rows.map(publicParticipant) });
  } catch (error) {
    next(error);
  }
};

/** POST /api/conversations/:id/participants */
export const addParticipants = async (req, res, next) => {
  try {
    const body = req.body || {};
    const added = await addParticipantsService(
      req.params.id,
      req.user._id,
      body.userIds ?? body.userId,
    );

    return res.status(201).json({
      message: 'Added to the chat.',
      added: added.map((id) => String(id)),
    });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/conversations/:id/participants */
export const leaveConversation = async (req, res, next) => {
  try {
    await leaveConversationService(req.params.id, req.user._id);

    return res.status(200).json({ message: 'You left the chat.' });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/conversations/:id/participants/:userId */
export const removeParticipant = async (req, res, next) => {
  try {
    await removeParticipantService(req.params.id, req.user._id, req.params.userId);

    return res.status(200).json({ message: 'Removed from the chat.' });
  } catch (error) {
    next(error);
  }
};
