import mongoose from 'mongoose';

export const connectDB = async () => {
  const MONGODB_URL = process.env.MONGODB_URL || '';


  if (!MONGODB_URL) {
    throw new Error('MONGODB_URL is not set. Add it to your .env file.');
  }

  await mongoose.connect(MONGODB_URL);
  console.log('Database connected');
};
