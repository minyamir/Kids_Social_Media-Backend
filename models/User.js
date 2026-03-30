const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    unique: true, 
    required: true 
  },
  email: { 
    type: String, 
    unique: true, 
    required: true 
  },
  // googleId is sparse because manual users won't have it
  googleId: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  // passwordHash is now optional to allow Google OAuth users to save
  passwordHash: { 
    type: String, 
    required: false 
  },
  otp: { 
    type: String 
  }, 
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  followers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  following: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  // Password reset fields
  resetPasswordToken: String,      // hashed token
  resetPasswordExpires: Date,      // expiry timestamp
  avatarUrl: String,
  bio: String,
  strikes: { 
    type: Number, 
    default: 0 
  },
  status: { 
    type: String, 
    enum: ["active", "suspended", "banned"], 
    default: "active" 
  },
  // Inside userSchema in user.js
  isLive: { 
    type: Boolean, 
    default: false 
  },
  liveStreamTitle: { 
    type: String 
  },
  isOnline: { 
    type: Boolean, 
    default: false 
  },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);