const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  videoUrl: String,
  caption: String,
isApproved: { type: Boolean, default: true },
  moderation: {
    nudity: Number,
    violence: Number,
    safe: Boolean,
    reason: String
  },
  likesCount: { type: Number, default: 0 }, 
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Track users who liked
  commentsCount: { type: Number, default: 0 },
  repostsCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Video", videoSchema);
