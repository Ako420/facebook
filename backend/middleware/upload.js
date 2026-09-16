import multer from 'multer';
import { ApiError } from '../utils/apiError.js';


export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 6;


const storage = multer.memoryStorage();

export const isVideo = (file) => file.mimetype.startsWith('video/');
export const isImage = (file) => file.mimetype.startsWith('image/');

const fileFilter = (_req, file, callback) => {
  if (!isImage(file) && !isVideo(file)) {
    return callback(
      ApiError.badRequest(`${file.originalname} is not an image or video.`, {
        media: 'Only image and video files can be uploaded.',
      }),
    );
  }

  return callback(null, true);
};

/**
 * set to the video limit
 * image limit is enforced per file in uploadService.
 */
export const uploadMedia = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_VIDEO_BYTES, files: MAX_FILES },
}).array('media', MAX_FILES);
