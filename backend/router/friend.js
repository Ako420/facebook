import express from 'express'
import { protect } from '../middleware/auth.js';

import {
  getFriendById,
  createFriend,
  updateFriendStatus,
  deleteFriend,
  getFriendsByUserId,
  getSuggestions,
} from '../controllers/friendController.js';

const router = express.Router();


router.get('/user', protect, getFriendsByUserId);


router.get('/suggestions', protect, getSuggestions);


router.get('/:id', protect, getFriendById);

router.post('/', protect, createFriend);

router.put('/:id', protect, updateFriendStatus);
router.delete('/:id', protect, deleteFriend);

export default router;
