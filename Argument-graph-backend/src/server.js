import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import { isCloudinaryConfigured } from './config/cloudinary.js';
import { isEmailConfigured } from './config/email.js';

const PORT = process.env.PORT || 5000;

// Test configurations on startup
// console.log('🔧 Testing configurations...');

// Test Cloudinary configuration
// if (isCloudinaryConfigured()) {
//   console.log('✅ Cloudinary configuration is valid');
// } else {
//   console.log('⚠️  Cloudinary configuration is missing - avatar uploads will be disabled');
// }

// Test Email configuration
// if (isEmailConfigured()) {
//   console.log('✅ Email configuration is valid');
// } else {
//   console.log('⚠️  Email configuration is missing - password reset will be disabled');
// }

connectDB();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
});