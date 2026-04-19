const express = require("express");
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const authMiddleware = require("../middleware/auth.middleware");
const { uploadAvatar } = require("../middleware/upload.middleware");
const User = require("../models/User");

const {
  register,
  verifyOtp,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  resendOtp
} = require("../controllers/auth.controller");

// --- Google OAuth Routes ---

// 1. Kick off the Google login process
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2. Google redirects back here
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    // Sign the token using the User ID from Google Strategy
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // Dynamic Redirect based on environment
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? "https://kids-scoial-media.vercel.app" 
      : "http://localhost:5173";

    res.redirect(`${frontendUrl}/login-success?token=${token}`);
  }
);

// --- Public Routes ---
router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/resend-otp", resendOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// --- Protected Routes ---
router.get("/profile", authMiddleware, getProfile);

// Fetch specific scholar data (for chat/profile viewing)
router.get("/user/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("username avatarUrl email");
    if (!user) {
      return res.status(404).json({ msg: "Scholar not found in archives" });
    }
    res.json(user);
  } catch (err) {
    console.error("Error fetching scholar:", err);
    res.status(500).json({ msg: "Server error accessing scholar data" });
  }
});

router.put("/change-password", authMiddleware, changePassword);
router.put("/update-profile", authMiddleware, uploadAvatar.single('avatar'), updateProfile);

module.exports = router;