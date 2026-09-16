import mongoose from "mongoose";
const reactions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];


const postSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: {
        values: ["post", "reel"],
        message: "Type must be either post or reel.",
      },
      default: "post",
      index: true,
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: [String],
      trim: true,
    },
    videoUrl: {
      type: [String],
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Groups",
      default: null,
      index: true,
    },
    reaction:[
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
          required: true,
        },
        type: {
          type: Number,
          enum: {
            values: reactions,
            message: "Reaction must be a number between 1 and 10.",
          },
        },
      },
    ],
     likeCount:{
    type:Number,
    default:0,
    min:0
  },
  commentCount:{
    type:Number,
    default: 0,
    min:0
  },
  },
  { timestamps: true },
);

export const Post = mongoose.model("Posts", postSchema);
