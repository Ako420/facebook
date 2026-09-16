import mongoose from 'mongoose';

const friendSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    friendId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
    },
  status:{
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  }
},{ timestamps: true });

export const Friend = mongoose.model('Friends', friendSchema);