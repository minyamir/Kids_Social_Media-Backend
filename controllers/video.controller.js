const Video = require("../models/Video");
const User = require("../models/User");
const { analyzeVideoContent } = require("../services/moderation.service");
const fs = require("fs");
const path = require("path");


exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No video uploaded" });

    const caption = req.body.caption || "";
    // Multer gives us the relative path (e.g., 'uploads/videos/file.mp4')
    const filePath = req.file.path; 

    // 🔥 1. START AI SCAN
    const moderation = await analyzeVideoContent(filePath, caption);

    // 🔥 2. HANDLE BAN (Permanent Lock)
    if (moderation.action === "BAN") {
      await User.findByIdAndUpdate(req.user._id, { 
        isBanned: true, 
        banReason: moderation.reason 
      });
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath); // Delete bad video
      return res.status(403).json({ msg: "CRITICAL VIOLATION: Account Banned." });
    }

    // 🔥 3. HANDLE REJECT (Wrong Topic)
    if (moderation.action === "REJECT") {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath); // Delete off-topic video
      return res.status(400).json({ msg: `REJECTED: ${moderation.reason}` });
    }

    // ✅ 4. IF APPROVED, SAVE TO DB
    const video = new Video({
      userId: req.user._id,
      videoUrl: `/uploads/videos/${req.file.filename}`, // URL for frontend
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
    // 1. Fetch videos and populate
    // NOTE: Ensure 'userId' matches the field name in your Video Schema exactly!
    const videos = await Video.find({ isApproved: true })
      .populate("userId", "username avatarUrl")
      .sort({ createdAt: -1 })
      .lean(); // Converts to plain JS objects for better performance

    // 2. The "Ghost User" Check 🛡️
    // If a video exists but the user who made it was deleted, 
    // .populate returns null for userId, which crashes the Frontend.
    const filteredVideos = videos.filter(video => {
      if (!video.userId) {
        console.warn(`Video ${video._id} has no valid user. Skipping...`);
        return false;
      }
      return true;
    });

    // 3. Always send back the object structure the Frontend expects
    res.status(200).json({ 
      success: true,
      videos: filteredVideos 
    });

  } catch (err) {
    // This logs the EXACT reason for the 500 error in your terminal
    console.error("FEED_CONTROLLER_ERROR:", err.message);
    
    res.status(500).json({ 
      msg: "Internal Server Error", 
      error: err.message 
    });
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

    // 🔒 Security: Check if the user owns the video
    if (video.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to delete this" });
    }

    // 🗑️ 1. Delete the physical file from the 'uploads' folder
    const filePath = path.join(__dirname, '../', video.videoUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 🗑️ 2. Delete from Database
    await Video.findByIdAndDelete(req.params.id);

    res.json({ msg: "Lesson deleted successfully" });
  } catch (err) {
    res.status(500).send("Server Error");
  }
};
