const Video = require("../models/Video");
const User = require("../models/User");
const { analyzeVideoContent } = require("../services/moderation.service");
const fs = require("fs");
const path = require("path");
const cloudinary = require('cloudinary').v2;

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No video uploaded" });

    const caption = req.body.caption || "";
    // req.file.path is now the full https:// URL from Cloudinary
    const videoUrl = req.file.path; 

    // 🔥 1. START AI SCAN (Pass the Cloudinary URL to your service)
    const moderation = await analyzeVideoContent(videoUrl, caption);

    // 🔥 2. HANDLE BAN
    if (moderation.action === "BAN") {
      await User.findByIdAndUpdate(req.user._id, { 
        status: "banned",
        banReason: moderation.reason 
      });

      const io = req.app.get("io");
      if (io) {
        io.to(req.user._id.toString()).emit("accountBan", { reason: moderation.reason });
      }

      // Delete the violation video from Cloudinary immediately
      await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'video' });
      return res.status(403).json({ msg: "CRITICAL VIOLATION: Account Banned." });
    }

    // 🔥 3. HANDLE REJECT
    if (moderation.action === "REJECT") {
      await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'video' });
      return res.status(400).json({ msg: `REJECTED: ${moderation.reason}` });
    }

    // ✅ 4. IF APPROVED, SAVE TO DB
    const video = new Video({
      userId: req.user._id,
      videoUrl: videoUrl, // Secure HTTPS URL
      cloudinaryId: req.file.filename, // Store this to delete later!
      caption: caption,
      isApproved: true,
      category: moderation.category || "Education"
    });

    await video.save();
    res.json({ msg: "Scholar Content Approved!", video });

  } catch (err) {
    console.error("Upload Controller Error:", err);
    res.status(500).json({ msg: "Server error during upload." });
  }
};
exports.getAllVideos = async (req, res) => {
  try {
    // 🚀 STEP 1: The Aggregate Pipeline
    const videos = await Video.aggregate([
      { $match: { isApproved: true } }, 
      {
        $addFields: {
          // Calculate score: Reposts are weighted more heavily (5x) than likes (2x)
          rankingScore: {
            $add: [
              { $multiply: [{ $ifNull: ["$likesCount", 0] }, 2] },
              { $multiply: [{ $ifNull: ["$repostsCount", 0] }, 5] }
            ]
          }
        }
      },
      { $sort: { rankingScore: -1, createdAt: -1 } }, 
      { $limit: 50 } 
    ]);

    // 🚀 STEP 2: Manual Populate
    // aggregate() returns POJOs (Plain Old JavaScript Objects), 
    // so we use the Model's populate method manually.
    const populatedVideos = await Video.populate(videos, { 
      path: "userId", 
      select: "username avatarUrl" 
    });

    // 🚀 STEP 3: The Guard Rail (Ghost User Check)
    // This prevents the frontend from crashing if a user was deleted 
    // but their video remained in the DB.
    const filteredVideos = populatedVideos.filter(v => {
      if (!v.userId) {
        // console.warn(`[DATA INTEGRITY] Video ${v._id} missing user data.`);
        return false;
      }
      return true;
    });

    res.status(200).json({ 
      success: true, 
      count: filteredVideos.length,
      videos: filteredVideos 
    });

  } catch (err) {
    console.error("FEED_ERROR:", err.message);
    res.status(500).json({ msg: "Failed to load feed", error: err.message });
  }
};

// Get videos for the logged-in user
exports.getUserVideos = async (req, res) => {
  try {
    // We use req.user._id which comes from your authMiddleware
    const videos = await Video.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json(videos);
  } catch (err) {
    console.error("Error in getUserVideos:", err);
    res.status(500).json({ msg: "Server error while fetching your videos" });
  }
};


// Get single video by ID
exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate("userId", "username avatarUrl");

    if (!video) {
      return res.status(404).json({ msg: "Video not found" });
    }

    res.json({ video });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get videos only from scholars the user follows
exports.getFollowingVideos = async (req, res) => {
  try {
    const User = require("../models/User"); // Ensure User model is available
    
    // 1. Get current user's following list
    const currentUser = await User.findById(req.user._id);
    
    if (!currentUser || currentUser.following.length === 0) {
      return res.json({ videos: [] }); // Return empty if following no one
    }

    // 2. Find videos from those users
    const videos = await Video.find({ 
      userId: { $in: currentUser.following },
      isApproved: true 
    })
    .populate("userId", "username avatarUrl")
    .sort({ createdAt: -1 });

    res.json({ videos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error fetching following feed" });
  }
};
exports.searchVideos = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json({ videos: [] });
    }

    // 1. Find User IDs that match the search string (Username search)
    const matchedUsers = await User.find({
      username: { $regex: q, $options: "i" }
    }).select("_id");

    const userIds = matchedUsers.map(user => user._id);

    // 2. Query Videos: Match Caption OR Category OR UserID
    const videos = await Video.find({
      isApproved: true,
      $or: [
        { caption: { $regex: q, $options: "i" } },   // Search in Caption
        { category: { $regex: q, $options: "i" } },  // Search in Category
        { userId: { $in: userIds } }                 // Search by matched Usernames
      ]
    })
    .populate("userId", "username avatarUrl")
    .sort({ createdAt: -1 }) // Show newest results first
    .lean();

    res.json({ videos });
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ msg: "Search failed" });
  }
};
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) return res.status(404).json({ msg: "Video not found" });

    // 🔒 Security: Check ownership
    if (video.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to delete this" });
    }

    // 🗑️ 1. Delete from Cloudinary using the stored ID
    if (video.cloudinaryId) {
      await cloudinary.uploader.destroy(video.cloudinaryId, { resource_type: 'video' });
    }

    // 🗑️ 2. Delete from Database
    await Video.findByIdAndDelete(req.params.id);

    res.json({ msg: "Lesson deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).send("Server Error");
  }
};
