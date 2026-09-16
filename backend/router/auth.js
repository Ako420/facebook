import express from 'express';
import {
  register,
  login,
  getUser,
  getUserById,
  updateProfile,
  changePassword,
  deleteAccount,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { AuthLimiter } from '../middleware/rate-limiter.js';

const router = express.Router();

router.use(AuthLimiter);

router.post('/register', register);

router.post('/login', login);

router.route('/user').get(protect, getUser).patch(protect, updateProfile).delete(protect, deleteAccount);

router.get('/user/:id', protect, getUserById);

router.put('/password', protect, changePassword);

export default router;
