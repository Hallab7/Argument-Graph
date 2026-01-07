import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    // Allowed image types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
    }
  } else {
    cb(new ApiError(400, 'Only image files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  }
});

// Middleware for single avatar upload
export const uploadAvatar = upload.single('avatar');

// Middleware for optional avatar upload (doesn't fail if no file)
export const uploadAvatarOptional = (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      return next(err);
    }
    // Continue even if no file was uploaded
    next();
  });
};

// Error handling middleware for multer
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(400, 'File too large. Maximum size is 5MB.'));
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return next(new ApiError(400, 'Too many files. Only one file is allowed.'));
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ApiError(400, 'Unexpected field name. Use "avatar" as the field name.'));
    }
    return next(new ApiError(400, `Upload error: ${error.message}`));
  }
  
  next(error);
};