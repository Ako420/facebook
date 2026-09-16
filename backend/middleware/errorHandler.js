import { MulterError } from 'multer';
import { ApiError } from '../utils/apiError.js';
import { MAX_FILES, MAX_VIDEO_BYTES } from './upload.js';


export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Multer rejects oversized or too-many files before the controller runs.
  if (err instanceof MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: `Each file must be under ${MAX_VIDEO_BYTES / 1024 / 1024}MB.`,
      LIMIT_FILE_COUNT: `You can upload at most ${MAX_FILES} files at once.`,
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field. Send the files as "media".',
    };
    const message = messages[err.code] || 'That upload was rejected.';

    return res.status(400).json({ message, errors: { media: message } });
  }

  // Mongoose schema validation -> 400 with a per-field map.
  if (err.name === 'ValidationError') {
    const errors = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message])
    );
    return res.status(400).json({ message: 'Validation failed.', errors });
  }

 
  if (err.code === 11000) {
    const keys = Object.keys(err.keyPattern ?? err.keyValue ?? {});
    const message = keys.includes('email')
      ? 'That email is already registered.'
      : keys.includes('groupId') && keys.includes('userId')
        ? 'That person is already in this group, invited, or waiting on an admin.'
        : 'That already exists. Refresh and try again.';

    return res.status(409).json({ message });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid value for ${err.path}.` });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  console.error(err);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
};
