import mongoose from 'mongoose';
const reactions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const reelSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
    },
    description:{
        type: String,
        trim: true,
        maxLength:[500,'Description cannot exceed 500 characters']
    },
    videoUrl: {
        type: String,
        trim: true,
        required: [true, 'Video URL is required.'],
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    reaction: {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          enum: {
            values: reactions,
            message: "Reaction must be a number between 1 and 10.",
          },
        },
         likeCount:{
        type:Number,
        default:0,
        min:0
      },
      commentCount:{
        type:Number,
        default: 0,
        min:0
      }

},{ timestamps: true });

export const Reel = mongoose.model('Reels', reelSchema);