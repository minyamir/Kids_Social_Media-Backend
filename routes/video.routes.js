const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const { uploadVideo: videoMiddleware } = require("../middleware/upload.middleware");

const { 
  uploadVideo, 
  getAllVideos, 
  getVideoById, 
  getUserVideos ,
  getFollowingVideos,
  searchVideos,
  deleteVideo 
} = require("../controllers/video.controller");

// Upload a video
router.post(
  "/upload",
  authMiddleware,
  // Using .single("video") directly is cleaner
  videoMiddleware.single("video"), 
  (req, res, next) => {
    if (!req.file) return res.status(400).json({ msg: "Please select a video file" });
    next();
  },
  uploadVideo
);

router.get("/feed", getAllVideos);
router.get("/following", authMiddleware, getFollowingVideos);
router.get("/my-videos", authMiddleware, getUserVideos);
router.get("/search", searchVideos);
router.get("/:id", authMiddleware, getVideoById);
router.delete("/:id", authMiddleware, deleteVideo);

module.exports = router;