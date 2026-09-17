import { withinChangeWindow } from '../model/message.js';

const publicAuthor = (user) =>
  user && typeof user === 'object'
    ? { id: user._id, name: user.name, avatarUrl: user.avatarUrl }
    : { id: user };

const populated = (value) => (value && typeof value === 'object' && value._id ? value : null);

export const publicMessage = (message, viewerId) => {
  const mine = String(message.senderId?._id ?? message.senderId) === String(viewerId);
  const changeable = mine && !message.deletedAt && withinChangeWindow(message);

  return {
    id: message._id,
    conversationId: message.conversationId,
    text: message.deletedAt ? '' : (message.text ?? ''),
    attachments: message.deletedAt ? [] : (message.attachments ?? []),
    replyTo: message.replyTo ?? null,
    createdAt: message.createdAt,
    editedAt: message.editedAt ?? null,
    deleted: Boolean(message.deletedAt),
    fromViewer: mine,
    canEdit: changeable,
    canUnsend: changeable,
    sender: publicAuthor(message.senderId),
  };
};

export const publicNotification = (row) => {
  const post = populated(row.postId);
  const comment = populated(row.commentId);
  const group = populated(row.groupId);

  return {
    id: row._id,
    type: row.type,
    actor: publicAuthor(row.actorId),
    post: post ? { id: post._id, type: post.type ?? 'post', groupId: post.groupId ?? null } : null,
    comment: comment ? { id: comment._id, preview: (comment.content ?? '').slice(0, 100) } : null,
    group: group ? { id: group._id, name: group.name } : null,
    createdAt: row.createdAt,
    readAt: row.readAt ?? null,
    isRead: Boolean(row.readAt),
  };
};
