import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        trim: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    postId: {      
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Posts',
        required: true,
    },

},{ timestamps: true });

export const Comment = mongoose.model('Comments', commentSchema);