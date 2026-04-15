const express = require("express");
const router = express.Router();
const passport = require('passport'); // Add this
const jwt = require('jsonwebtoken'); // Add this to generate tokens for Google users
const authMiddleware = require("../middleware/auth.middleware");
const { uploadAvatar } = require("../middleware/upload.middleware");
const {
  register,
  verifyOtp,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  resendOtp //
} = require("../controllers/auth.controller");

// --- Google OAuth Routes ---

// 1. Kick off the Google login process
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2. Google redirects back to this route
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    // Generate a JWT for the user that just logged in via Google
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // Redirect to your frontend. 
    // We pass the token in the URL so React can grab it and log the user in.
    res.redirect(`http://localhost:5173/login-success?token=${token}`);
  }
);

// --- Existing Public routes ---
router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/resend-otp", resendOtp);

// Forgot / Reset password
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
// TEMP TEST ROUTE
router.post("/test-google-email", async (req, res) => {
    const { sendWelcomeEmail } = require('../services/email.service');
    try {
        await sendWelcomeEmail(req.body.email, "TestScholar", "GOOGLE_AUTH");
        res.json({ msg: "3D Google Email Sent!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Protected routes (require JWT) ---
router.get("/profile", authMiddleware, getProfile);
// 🔥 ADD THIS ROUTE HERE:
router.get("/user/:id", authMiddleware, async (req, res) => {
  try {
    const User = require("../models/User"); // Ensure User model is accessible
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