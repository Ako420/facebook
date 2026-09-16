import {
  cloudinary,
  CLOUDINARY_FOLDER,
  isCloudinaryConfigured,
} from '../config/cloudinary.js';
import { isVideo, MAX_IMAGE_BYTES } from '../middleware/upload.js';
import { Upload } from '../model/upload.js';
import { Post } from '../model/post.js';
import { Message } from '../model/message.js';
import { Story } from '../model/story.js';
import { ApiError } from '../utils/apiError.js';
import { isValidObjectId } from '../utils/validators.js';

/**
 * Pushes one in-memory file to Cloudinary. `upload_stream` chunks the body as
 * it goes, which is what keeps large videos from being buffered a second time.
 */
const uploadOne = (file) =>
  new Promise((resolve, reject) => {
    const resourceType = isVideo(file) ? 'video' : 'image';

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        resource_type: resourceType,
        ...(resourceType === 'video'
          ? { eager: [{ format: 'mp4', quality: 'auto' }], eager_async: true }
          : { quality: 'auto' }),
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      },
    );

    stream.end(file.buffer);
  });

/** Cloudinary derives a still from any video frame; 1s in avoids black frames. */
const posterFor = (result) =>
  cloudinary.url(result.public_id, {
    resource_type: 'video',
    format: 'jpg',
    start_offset: '1',
  });

const describe = (file, result) => ({
  type: isVideo(file) ? 'video' : 'image',
  url: result.secure_url,
  publicId: result.public_id,
  width: result.width,
  height: result.height,
  ...(isVideo(file)
    ? { durationSec: result.duration, poster: posterFor(result) }
    : {}),
});

/**
 * Uploads every file multer parsed and returns a descriptor per file.
 * Uploads run together — one slow video shouldn't hold up the images.
 */
export const uploadMediaService = async (files, userId) => {
  if (!isCloudinaryConfigured) {
    throw new ApiError(
      503,
      'Uploads are not available: Cloudinary credentials are missing from .env.',
    );
  }

  if (!files || files.length === 0) {
    throw ApiError.badRequest('Please choose at least one file to upload.', {
      media: 'No file received.',
    });
  }

  const tooBig = files.find((file) => !isVideo(file) && file.size > MAX_IMAGE_BYTES);
  if (tooBig) {
    throw ApiError.badRequest(
      `${tooBig.originalname} is larger than ${MAX_IMAGE_BYTES / 1024 / 1024}MB.`,
      { media: `Each image must be under ${MAX_IMAGE_BYTES / 1024 / 1024}MB.` },
    );
  }

  let media;
  try {
    const results = await Promise.all(files.map(uploadOne));
    media = results.map((result, index) => describe(files[index], result));
  } catch (error) {
    throw new ApiError(502, error?.message || 'The upload provider rejected that file.');
  }

  if (userId) {
    try {
      await Upload.insertMany(
        media.map((row, index) => ({
          publicId: row.publicId,
          userId,
          type: row.type,
          url: row.url,
          bytes: files[index]?.size,
        })),
        { ordered: false },
      );
    } catch (error) {
      console.error('Could not record uploads:', error?.message);
    }
  }

  return media;
};


export const claimUploads = async (items = [], userId) => {
  const publicIds = (Array.isArray(items) ? items : [items])
    .map((item) =>
      typeof item === 'string' ? describeCloudinaryUrl(item)?.publicId : item?.publicId,
    )
    .filter(Boolean);

  if (publicIds.length === 0) return 0;

  try {
    const { modifiedCount } = await Upload.updateMany(
      { publicId: { $in: publicIds }, ...(userId ? { userId } : {}) },
      { $set: { claimedAt: new Date() } },
    );
    return modifiedCount;
  } catch (error) {
    console.error('Could not claim uploads:', error?.message);
    return 0;
  }
};

/** True when any post or message still carries this file. */
const isReferenced = async ({ publicId, url }) => {
  const [inPost, inMessage, inStory] = await Promise.all([
    Post.exists({ $or: [{ imageUrl: url }, { videoUrl: url }] }),
    Message.exists({ 'attachments.publicId': publicId }),
    Story.exists({ $or: [{ 'media.publicId': publicId }, { 'media.url': url }] }),
  ]);

  return Boolean(inPost || inMessage || inStory);
};


export const discardUploadsService = async (publicIds, userId) => {
  const wanted = [...new Set((Array.isArray(publicIds) ? publicIds : [publicIds]).map(String))]
    .map((id) => id.trim())
    .filter(Boolean);

  if (wanted.length === 0) {
    throw ApiError.badRequest('Please correct the highlighted fields.', {
      publicIds: 'Name at least one upload to discard.',
    });
  }

  if (!isValidObjectId(userId)) throw ApiError.unauthorized();

  const rows = await Upload.find({
    publicId: { $in: wanted },
    userId,
    claimedAt: null,
  }).lean();

  const removable = [];
  for (const row of rows) {
    if (await isReferenced(row)) {
      await Upload.updateOne({ _id: row._id }, { $set: { claimedAt: new Date() } });
      continue;
    }
    removable.push(row);
  }

  const { destroyed } = await destroyMedia(removable);

  return { discarded: destroyed, skipped: wanted.length - removable.length };
};

//delete on use file from cloudinary,to 
export const sweepAbandonedUploads = async ({ olderThanMs = 24 * 60 * 60 * 1000 } = {}) => {
  const cutoff = new Date(Date.now() - olderThanMs);

  const stale = await Upload.find({ claimedAt: null, createdAt: { $lt: cutoff } })
    .limit(500)
    .lean();

  const removable = [];
  let kept = 0;

  for (const row of stale) {
    if (await isReferenced(row)) {
      await Upload.updateOne({ _id: row._id }, { $set: { claimedAt: new Date() } });
      kept += 1;
      continue;
    }
    removable.push(row);
  }

  const { destroyed, failed } = await destroyMedia(removable);

  return { examined: stale.length, destroyed, failed, kept };
};


export const describeCloudinaryUrl = (url) => {
  if (typeof url !== 'string' || !url.trim()) return null;

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  if (parsed.hostname !== 'res.cloudinary.com') return null;

  const [cloudName, resourceType, deliveryType, ...rest] = parsed.pathname
    .split('/')
    .filter(Boolean);

  if (!cloudName || cloudName !== process.env.CLOUDINARY_CLOUD_NAME) return null;
  if (resourceType !== 'image' && resourceType !== 'video') return null;
  if (deliveryType !== 'upload') return null;

  const version = rest.findIndex((segment) => /^v\d+$/.test(segment));
  const path = version === -1 ? [...rest] : rest.slice(version + 1);
  if (path.length === 0) return null;

  const file = path[path.length - 1];
  const dot = file.lastIndexOf('.');
  path[path.length - 1] = dot > 0 ? file.slice(0, dot) : file;

  return { type: resourceType, url, publicId: path.join('/') };
};

/** The same cleanup for anything stored as a bare URL, which is how posts keep media. */
export const destroyMediaUrls = (urls = []) =>
  destroyMedia(
    (Array.isArray(urls) ? urls : [urls]).map(describeCloudinaryUrl).filter(Boolean),
  );

/**
 * Takes files off Cloudinary once nothing points at them any more.
 */
export const destroyMedia = async (attachments = []) => {
  if (!isCloudinaryConfigured) return { destroyed: 0, failed: 0 };

  const targets = attachments.filter((media) => media?.publicId);
  let destroyed = 0;
  let failed = 0;

  await Promise.all(
    targets.map(async (media) => {
      try {
        await cloudinary.uploader.destroy(media.publicId, {
          resource_type: media.type === 'video' ? 'video' : 'image',
          invalidate: true,
        });
        destroyed += 1;
      } catch (error) {
        failed += 1;
        console.error(`Could not remove ${media.publicId} from Cloudinary:`, error?.message);
      }
    }),
  );

  if (targets.length > 0) {
    try {
      await Upload.deleteMany({ publicId: { $in: targets.map((row) => row.publicId) } });
    } catch (error) {
      console.error('Could not clear upload records:', error?.message);
    }
  }

  return { destroyed, failed };
};
