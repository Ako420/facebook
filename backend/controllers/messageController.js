import {
  editMessageService,
  hideMessageService,
  listMessagesService,
  sendMessageService,
  unsendMessageService,
} from '../service/messageService.js';
import { publicMessage } from '../utils/presenters.js';

/** GET /api/conversations/:id/messages */
export const listMessages = async (req, res, next) => {
  try {
    const { messages, nextCursor } = await listMessagesService(
      req.params.id,
      req.user._id,
      { limit: req.query.limit, before: req.query.before },
    );

    return res.status(200).json({
      messages: messages.map((message) => publicMessage(message, req.user._id)),
      nextCursor,
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/conversations/:id/messages */
export const sendMessage = async (req, res, next) => {
  try {
    const message = await sendMessageService(req.params.id, req.user._id, req.body);
    await message.populate('senderId', 'name avatarUrl');

    return res.status(201).json({
      message: 'Message sent.',
      data: publicMessage(message.toObject(), req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/conversations/:id/messages/:messageId */
export const editMessage = async (req, res, next) => {
  try {
    const message = await editMessageService(
      req.params.id,
      req.params.messageId,
      req.user._id,
      req.body,
    );
    await message.populate('senderId', 'name avatarUrl');

    return res.status(200).json({
      message: 'Message updated.',
      data: publicMessage(message.toObject(), req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/conversations/:id/messages/:messageId?scope=me|everyone
 */
export const removeMessage = async (req, res, next) => {
  try {
    const scope = req.query.scope === 'me' ? 'me' : 'everyone';

    if (scope === 'me') {
      await hideMessageService(req.params.id, req.params.messageId, req.user._id);

      return res.status(200).json({ scope, message: 'Message removed for you.' });
    }

    await unsendMessageService(req.params.id, req.params.messageId, req.user._id);

    return res.status(200).json({ scope, message: 'Message removed for everyone.' });
  } catch (error) {
    next(error);
  }
};
