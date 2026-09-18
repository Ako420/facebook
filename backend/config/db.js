import mongoose from 'mongoose';

const RETRY_STEP_MS = 3_000;
const RETRY_CEILING_MS = 30_000;


mongoose.set('bufferTimeoutMS', 30_000);

export const connectDB = async () => {
  const MONGODB_URL = process.env.MONGODB_URL || '';

  if (!MONGODB_URL) {
    throw new Error('MONGODB_URL is not set. Add it to your .env file.');
  }

  await mongoose.connect(MONGODB_URL, {
    serverSelectionTimeoutMS: 15_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: Number(process.env.MONGODB_POOL_SIZE) || 10,
    autoIndex: process.env.NODE_ENV !== 'production',
  });

  console.log('Database connected');
};

/**
 * Keeps trying in the background. A database that is slow or briefly away
 * should not stop the server from answering, and must not turn into a restart
 * loop on the host.
 */
export const connectDBWithRetry = async () => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await connectDB();
      return;
    } catch (error) {
      console.error(`Database connection failed (attempt ${attempt}):`, error.message);
      const wait = Math.min(RETRY_STEP_MS * attempt, RETRY_CEILING_MS);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
};
