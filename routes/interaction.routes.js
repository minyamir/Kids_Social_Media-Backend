const express = require("express");
const router = express.Router();
// Use a consistent name for the middleware
const auth = require("../middleware/auth.middleware");

// Import all functions from the controller
const interactionController = require("../controllers/interaction.controller");

// Extract the existing functions for convenience (or use interactionController.functionName)
const {
  addComment,
  toggleLike,
  repostVideo,
  toggleFollow,
  getComments
} = interactionController;

// --- Comments ---
router.post("/comment", auth, addComment);
router.get("/comments/:videoId", auth, getComments);

// --- Chat / Inbox System ---
router.get("/conversations", auth, interactionController.getConversations);
router.get("/messages/:otherUserId", auth, interactionController.getMessages);
router.post("/message/send", auth, interactionController.sendMessage);
// 🔥 ADD THIS LINE HERE:
router.get("/search-scholars", auth, interactionController.searchScholars);
// --- Like ---
router.post("/like", auth, toggleLike);

// --- Repost ---
router.post("/repost", auth, repostVideo);

// --- Follow / Unfollow ---
router.post("/follow", auth, toggleFollow);
// 1. Get all users currently live (For the Live Feed / Navbar)
router.get("/live-users", auth, interactionController.getLiveUsers);

// 2. Set own live status (To start/stop a stream)
router.post("/live-status", auth, interactionController.setLiveStatus);

module.exports = router;