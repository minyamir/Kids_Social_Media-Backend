const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const jwt = require("jsonwebtoken");
const generateOTP = require("../utils/generateOTP");
const { sendWelcomeEmail, sendResetPasswordEmail } = require("../services/email.service");

const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/dotenv");

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

  
// At least 8 characters, must contain at least one letter and one number
const mediumPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

if (!mediumPasswordRegex.test(password)) {
  return res.status(400).json({
    msg: "Password must be at least 8 characters and include both letters and numbers."
  });
} 
    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    const user = await User.create({
      username,
      email,
      passwordHash,
      otp,
      isVerified: false
    });

    await sendWelcomeEmail(email, username, otp);

    res.json({ msg: "User created. OTP sent to email." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};


exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if(!user || user.otp !== otp) return res.status(400).json({ msg: "Invalid OTP" });

  user.isVerified = true;
  user.otp = null;
  await user.save();

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
 // To:
res.json({ 
  msg: "Account verified", 
  token, 
  user: {
    _id: user._id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    isVerified: user.isVerified
  } 
});
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ msg: "User not found" });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(400).json({ msg: "Incorrect password" });

  // Prevent login if account is not verified
  if (!user.isVerified) return res.status(403).json({ msg: "Please verify your account first" });

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({ token });
};

exports.getProfile = async (req, res) => {
  try {
    // req.user is added by authMiddleware
    res.json({ user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
exports.googleAuthSuccess = async (req, res) => {
  if (!req.user) {
    return res.redirect('http://localhost:5173/login?error=auth_failed');
  }

  // Check if the scholar is already verified
  if (!req.user.isVerified) {
    // If NOT verified, redirect to OTP page and pass the email so the frontend knows who to verify
    return res.redirect(`http://localhost:5173/verify-otp?email=${req.user.email}&status=unverified`);
  }

  // If already verified, proceed to login as normal
  const token = jwt.sign({ id: req.user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.redirect(`http://localhost:5173/login-success?token=${token}`);
};
exports.updateProfile = async (req, res) => {
  try {
    const { username, bio } = req.body;
    const updateData = {};

    if (username) updateData.username = username;
    if (bio) updateData.bio = bio;
    if (req.file) {
      updateData.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    }

    // This is safer than .save() for profile updates
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-passwordHash"); // Don't send the password back to the frontend

    if (!updatedUser) {
      return res.status(404).json({ msg: "Scholar not found" });
    }

    res.json({
      msg: "Profile updated successfully",
      user: updatedUser
    });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ msg: "Server error during update" });
  }
};
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ msg: "User not found" });
    if (user.isVerified) return res.status(400).json({ msg: "Account already verified" });

    // Generate new OTP and update user
    const newOtp = generateOTP();
    user.otp = newOtp;
    await user.save();

    // Send email
    await sendWelcomeEmail(email, user.username, newOtp);

    res.json({ msg: "A fresh code has been sent to your email." });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};
// Change password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = req.user;

    const match = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!match) return res.status(400).json({ msg: "Old password is incorrect" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ msg: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "Email not found" });

    // Generate raw token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token for storage
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Create the link with raw token
    const resetLink = `http://localhost:5000/api/auth/reset-password/${resetToken}`;
    console.log("Reset link (sent to user):", resetLink); // 🔥 debug

    await sendResetPasswordEmail(user.email, user.username, resetLink);

    res.json({ msg: "Password reset link sent to email", resetLink }); // return for testing

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};


exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Hash the raw token from URL
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user)
      return res.status(400).json({ msg: "Invalid or expired token" });

    // Password strength validation
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        msg: "Weak password. Include uppercase, lowercase, number, special char, 8+ characters."
      });
    }

    // Update password & clear token
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ msg: "Password reset successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
