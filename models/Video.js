const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  videoUrl: { 
    type: String, 
    required: true 
  },
  // 🔥 CRITICAL: Store the Cloudinary Public ID for deletions/edits
  cloudinaryId: { 
    type: String, 
    required: true 
  },
  caption: String,
  category: { 
    type: String, 
    default: "Education" 
  }, // Pillar: Learning, Patriotism, or Kidpreneurship
  isApproved: { 
    type: Boolean, 
    default: true 
  },
  moderation: {
    nudity: Number,
    violence: Number,
    safe: Boolean,
    reason: String
  },
  likesCount: { type: Number, default: 0 }, 
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  commentsCount: { type: Number, default: 0 },
  repostsCount: { type: Number, default: 0 }
}, { timestamps: true });

// Add an index for the ranking algorithm (likes + reposts)
videoSchema.index({ likesCount: -1, repostsCount: -1 });

module.exports = mongoose.model("Video", videoSchema);