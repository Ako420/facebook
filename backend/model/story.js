import mongoose from "mongoose";

export const story_types = ["image", "video", "text"];

/** How long a story stays up. */
export const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** Matches what POST /api/upload returns, so the client passes it straight through. */
const mediaSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: {
        values: ["image", "video"],
        message: "Media must be either an image or a video.",
      },
      required: true,
    },
    url: {
      type: String,
      trim: true,
      required: [true, "Media url is required."],
    },
    publicId: { type: String, trim: true },
    width: { type: Number },
    height: { type: Number },
    poster: { type: String, trim: true },
    durationSec: { type: Number },
  },
  { _id: false },
);

const storySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: story_types,
        message: "A story is an image, a video or text.",
      },
      required: true,
    },
    media: {
      type: mediaSchema,
      default: undefined,
    },
    // The caption on a photo, or the whole story on a text one.
    text: {
      type: String,
      trim: true,
      maxlength: [250, "A story caption must be at most 250 characters."],
    },
    background: {
      type: String,
      trim: true,
      maxlength: [120, "That background is not valid."],
    },
    viewCount: {
      type: Number,
      default: 0,
      min: [0, "View count cannot be negative."],
    },
    /**
     * Deliberately not a TTL index. Mongo would drop the row on its own and
     * the picture would stay on Cloudinary with nothing left pointing at it,
     * so expiry is a filter on reads and a sweep that cleans up properly.
     */
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// The rail's query: these people, still live, newest first.
storySchema.index({ userId: 1, expiresAt: 1, createdAt: -1 });

export const Story = mongoose.model("Stories", storySchema);
