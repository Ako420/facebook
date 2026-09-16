import express from 'express';
import { protect } from '../middleware/auth.js';
import { createComment, listComments, deleteComment } from '../controllers/engagementController.js';
import { apiLimiter } from '../middleware/rate-limiter.js';

const router = express.Router();
router.use(apiLimiter);

router.route("/:postId").get(protect, listComments).post(protect, createComment);

router.route("/:commentId").delete(protect, deleteComment);

export default router;
