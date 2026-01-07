import { v2 as cloudinary } from 'cloudinary';
import { ApiError } from '../utils/ApiError.js';

// Initialize Cloudinary configuration
let isConfigured = false;

const initializeCloudinary = () => {
  if (!isConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    isConfigured = true;
  }
};

// Validate Cloudinary configuration
export const validateCloudinaryConfig = () => {
  initializeCloudinary();
  
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloud_name || !api_key || !api_secret) {
    console.error('Cloudinary config check:', {
      cloud_name: !!cloud_name,
      api_key: !!api_key,
      api_secret: !!api_secret,
      env_cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
      env_api_key: !!process.env.CLOUDINARY_API_KEY,
      env_api_secret: !!process.env.CLOUDINARY_API_SECRET
    });
    throw new Error('Cloudinary configuration is incomplete. Please check your environment variables.');
  }
  
  console.log('✅ Cloudinary configuration validated successfully');
  return true;
};

// Check if Cloudinary is configured
export const isCloudinaryConfigured = () => {
  try {
    validateCloudinaryConfig();
    return true;
  } catch (error) {
    console.warn('Cloudinary not configured:', error.message);
    return false;
  }
};

// Upload image to Cloudinary
export const uploadToCloudinary = async (fileBuffer, options = {}) => {
  try {
    if (!isCloudinaryConfigured()) {
      throw new ApiError(500, 'Avatar upload is not available. Image service is not configured.');
    }

    initializeCloudinary();

    const defaultOptions = {
      folder: 'argument-graph/avatars',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      ...options
    };

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        defaultOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new ApiError(500, 'Failed to upload image to cloud storage'));
          } else {
            console.log('✅ Image uploaded successfully to Cloudinary');
            resolve(result);
          }
        }
      ).end(fileBuffer);
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Cloud storage configuration error');
  }
};

// Delete image from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!isCloudinaryConfigured()) {
      console.warn('Cloudinary not configured, skipping image deletion');
      return { result: 'not_found' };
    }
    
    initializeCloudinary();
    
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('✅ Image deleted from Cloudinary:', publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new ApiError(500, 'Failed to delete image from cloud storage');
  }
};

// Extract public ID from Cloudinary URL
export const extractPublicId = (cloudinaryUrl) => {
  if (!cloudinaryUrl) return null;
  
  try {
    // Extract public ID from Cloudinary URL
    // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/argument-graph/avatars/user123.jpg
    const urlParts = cloudinaryUrl.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex === -1) return null;
    
    // Get everything after 'upload/v{version}/'
    const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
    
    // Remove file extension
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

export default cloudinary;