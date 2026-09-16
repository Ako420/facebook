import { discardUploadsService, uploadMediaService } from '../service/uploadService.js';

/**
 * POST /api/upload  (protected)
 * Takes multipart `media` files and returns a descriptor for each one:
 * { type, url, publicId, width, height, poster?, durationSec? }
 */
export const uploadMedia = async (req, res, next) => {
  try {
    const media = await uploadMediaService(req.files, req.user._id);

    return res.status(201).json({ message: 'Upload complete.', media });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/upload  (protected)
 * Throws away files that were uploaded but never published.
 */
export const discardUploads = async (req, res, next) => {
  try {
    const body = req.body || {};
    const result = await discardUploadsService(
      body.publicIds ?? body.publicId,
      req.user._id,
    );

    return res.status(200).json({ message: 'Unused uploads discarded.', ...result });
  } catch (error) {
    next(error);
  }
};
