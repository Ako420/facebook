import express from 'express';
import { protect } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rate-limiter.js';
import {
  getUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(apiLimiter);

router.get('/', protect, listNotifications);

router.get('/unread', protect, getUnreadNotifications);
router.post('/read', protect, markAllNotificationsRead);

router.post('/:id/read', protect, markNotificationRead);

export default router;
