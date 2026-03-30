const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure directories exist
const videoDir = "uploads/videos";
const avatarDir = "uploads/avatars";

[videoDir, avatarDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Storage for Videos
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videoDir),
  filename: (req, file, cb) => {
    cb(null, `video-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Storage for Avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Filters
const videoFilter = (req, file, cb) => {
  file.mimetype.startsWith("video/") 
    ? cb(null, true) 
    : cb(new Error("Only video files allowed"), false);
};

const imageFilter = (req, file, cb) => {
  file.mimetype.startsWith("image/") 
    ? cb(null, true) 
    : cb(new Error("Only image files allowed"), false);
};

// Exports
const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for images
});

module.exports = { uploadVideo, uploadAvatar };