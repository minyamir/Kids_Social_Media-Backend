const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");

// 1. Destructure to get specifically 'uploadVideo' from your middleware
const { uploadVideo: videoMiddleware } = require("../middleware/upload.middleware");

const { 
  uploadVideo, 
  getAllVideos, 
  getVideoById, 
  getUserVideos ,
  getFollowingVideos,
  searchVideos,
  deleteVideo // Add deleteVideo to the destructuring 
} = require("../controllers/video.controller");
 
// Upload a video
router.post(
  "/upload",
  authMiddleware,
  // 2. Use the specific video middleware tool here
  (req, res, next) => {
    videoMiddleware.single("video")(req, res, (err) => {
      if (err) {
        // This catches things like "Only video files allowed" or "50MB limit"
        return res.status(400).json({ msg: err.message });
      }
      next();
    });
  },
  uploadVideo
);

// Get feed (Public)
router.get("/feed", getAllVideos);
router.get("/following", authMiddleware, getFollowingVideos);
// Get logged-in user's videos (Private)
router.get("/my-videos", authMiddleware, getUserVideos);
router.get("/search", searchVideos);
// Get single video by ID
router.get("/:id", authMiddleware, getVideoById);

// Delete a video
// Route: DELETE /api/videos/:id
router.delete("/:id", authMiddleware, deleteVideo);
module.exports = router;