import 'dotenv/config.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';

import '../model/user.js';
import '../model/post.js';
import '../model/postView.js';
import '../model/comment.js';
import '../model/friend.js';
import '../model/group.js';
import '../model/groupMember.js';
import '../model/conversation.js';
import '../model/conversationMember.js';
import '../model/message.js';
import '../model/notification.js';
import '../model/story.js';
import '../model/storyView.js';
import '../model/upload.js';

const run = async () => {
  await connectDB();

  for (const name of mongoose.modelNames()) {
    const created = await mongoose.model(name).syncIndexes();
    console.log(`${name}: ${created.length ? created.join(', ') : 'up to date'}`);
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Could not sync indexes:', error.message);
  process.exit(1);
});
