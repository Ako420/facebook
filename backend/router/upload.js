import express from 'express';
import { protect } from '../middleware/auth.js';
import { uploadMedia as parseMedia } from '../middleware/upload.js';
import { discardUploads, uploadMedia } from '../controllers/uploadController.js';

const router = express.Router();


router.post('/', protect, parseMedia, uploadMedia);
router.delete('/', protect, discardUploads);

export default router;
