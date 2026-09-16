import express from 'express';
import { protect } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rate-limiter.js';
import {
  addParticipants,
  deleteConversation,
  editConversation,
  getConversation,
  getUnreadSummary,
  leaveConversation,
  listConversations,
  listParticipants,
  markConversationRead,
  removeParticipant,
  startConversation,
} from '../controllers/conversationController.js';
import {
  editMessage,
  listMessages,
  removeMessage,
  sendMessage,
} from '../controllers/messageController.js';

const router = express.Router();

router.use(apiLimiter);

router.route('/').get(protect, listConversations).post(protect, startConversation);


router.get('/unread', protect, getUnreadSummary);

router
  .route('/:id/messages')
  .get(protect, listMessages)
  .post(protect, sendMessage);

router
  .route('/:id/messages/:messageId')
  .patch(protect, editMessage)
  .delete(protect, removeMessage);

router
  .route('/:id/participants')
  .get(protect, listParticipants)
  .post(protect, addParticipants)
  .delete(protect, leaveConversation);

router.delete('/:id/participants/:userId', protect, removeParticipant);

router.post('/:id/read', protect, markConversationRead);

router
  .route('/:id')
  .get(protect, getConversation)
  .patch(protect, editConversation)
  .delete(protect, deleteConversation);

export default router;
