import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createPost,
  getPost,
  listPosts,
  markPostsViewed,
  editPost,
  removePost,
} from '../controllers/postController.js';
import { setReaction, removeReaction } from '../controllers/engagementController.js';
import { apiLimiter } from '../middleware/rate-limiter.js';

const router = express.Router();

router.use(apiLimiter);


router.route('/').get(protect, listPosts).post(protect, createPost);

// Declared before /:id so "views" is not read as a post id.
router.post('/views', protect, markPostsViewed);

router.get('/:id', protect, getPost);
router.patch('/:id', protect, editPost);
router.delete('/:id', protect, removePost);

router
  .route('/:postId/reaction')
  .put(protect, setReaction)
  .delete(protect, removeReaction);

export default router;
