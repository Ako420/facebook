import mongoose from "mongoose";

/**
 * One row per file sent to Cloudinary, written the moment the upload lands.
 *
 * It exists so the server can answer two questions it otherwise could not:
 * who uploaded a given asset, and whether anything ever ended up pointing at
 * it. Without the first, a discard endpoint would let anyone delete anyone
 * else's media; without the second, an abandoned file would sit there forever.
 */
const uploadSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ["image", "video"],
        message: "Type must be either image or video.",
      },
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    bytes: {
      type: Number,
    },
    // Set once a post or a message actually carries this file.
    claimedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// The sweeper's query: unclaimed, and old enough to have been given up on.
uploadSchema.index({ claimedAt: 1, createdAt: 1 });

export const Upload = mongoose.model("Uploads", uploadSchema);
