import express from 'express';
import { protect } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rate-limiter.js';
import {
  createStory,
  listMyStories,
  listStories,
  listStoryViewers,
  markStoryViewed,
  removeStory,
} from '../controllers/storyController.js';

const router = express.Router();

router.use(apiLimiter);

router.route('/').get(protect, listStories).post(protect, createStory);


router.get('/mine', protect, listMyStories);

router
  .route('/:id/views')
  .get(protect, listStoryViewers)
  .post(protect, markStoryViewed);

router.delete('/:id', protect, removeStory);

export default router;
