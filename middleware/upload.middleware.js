const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 1. Configure Cloudinary
// Ensure these match your Render Environment Variables exactly!
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Cloudinary Storage for Videos
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'scholar_stadium/videos',
    resource_type: 'auto', // 🔥 Changed to 'auto' to better handle different codecs
    allowed_formats: ['mp4', 'mov', 'avi', 'mkv'],
    // Optional: add 'chunk_size' for large files if needed
  },
});

// 3. Cloudinary Storage for Avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'scholar_stadium/avatars',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // Added webp support
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }] 
  },
});

// 4. Export the specific uploaders with error limits
const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = { uploadVideo, uploadAvatar };