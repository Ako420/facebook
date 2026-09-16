import express from 'express';
import { protect } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rate-limiter.js';
import {
  listGroups,
  listInvitations,
  createGroup,
  getGroup,
  editGroup,
  removeGroup,
  joinGroup,
  leaveGroup,
  inviteMembers,
  approveMember,
  listMembers,
  removeMember,
  setMemberRole,
} from '../controllers/groupController.js';

const router = express.Router();

router.use(apiLimiter);

router.route('/').get(protect, listGroups).post(protect, createGroup);

// Declared before /:id so "invitations" is not read as a group id.
router.get('/invitations', protect, listInvitations);

router.route('/:id/members').get(protect, listMembers).post(protect, joinGroup).delete(protect, leaveGroup);
router.post('/:id/invites', protect, inviteMembers);
router
  .route('/:id/members/:userId')
  .patch(protect, approveMember)
  .delete(protect, removeMember);
router.put('/:id/members/:userId/role', protect, setMemberRole);

router.route('/:id').get(protect, getGroup).patch(protect, editGroup).delete(protect, removeGroup);

export default router;
