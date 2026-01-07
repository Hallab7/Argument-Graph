import crypto from 'crypto';
import OTP from '../modules/auth/otp.model.js';
import { ApiError } from './ApiError.js';

// Generate a random OTP
export const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  
  return otp;
};

// Create and save OTP
export const createOTP = async (email, type = 'password_reset', expiresInMinutes = 10) => {
  try {
    // Invalidate any existing OTPs for this email and type
    await OTP.invalidateAllForEmail(email, type);
    
    // Generate new OTP
    const otpCode = generateOTP(parseInt(process.env.OTP_LENGTH) || 6);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    
    // Save OTP to database
    const otp = await OTP.create({
      email: email.toLowerCase(),
      otp: otpCode,
      type,
      expiresAt
    });
    
    return {
      otpId: otp._id,
      otp: otpCode,
      expiresAt,
      expiresInMinutes
    };
  } catch (error) {
    console.error('OTP creation error:', error);
    throw ApiError.internalError('Failed to generate OTP');
  }
};

// Verify OTP
export const verifyOTP = async (email, otpCode, type = 'password_reset') => {
  try {
    // Find the OTP
    const otp = await OTP.findOne({
      email: email.toLowerCase(),
      otp: otpCode,
      type,
      isUsed: false
    });
    
    if (!otp) {
      throw ApiError.badRequest('Invalid or expired OTP');
    }
    
    // Check if OTP is expired
    if (otp.isExpired()) {
      throw ApiError.badRequest('OTP has expired');
    }
    
    // Check attempts limit
    if (otp.attempts >= 5) {
      throw ApiError.badRequest('Too many failed attempts. Please request a new OTP');
    }
    
    // Increment attempts
    otp.attempts += 1;
    await otp.save();
    
    // Mark as used
    otp.isUsed = true;
    await otp.save();
    
    return {
      success: true,
      otpId: otp._id,
      email: otp.email
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    console.error('OTP verification error:', error);
    throw ApiError.internalError('Failed to verify OTP');
  }
};

// Check if OTP exists and is valid (without marking as used)
export const checkOTP = async (email, otpCode, type = 'password_reset') => {
  try {
    const otp = await OTP.findOne({
      email: email.toLowerCase(),
      otp: otpCode,
      type,
      isUsed: false
    });
    
    if (!otp) {
      return { valid: false, reason: 'OTP not found' };
    }
    
    if (otp.isExpired()) {
      return { valid: false, reason: 'OTP expired' };
    }
    
    if (otp.attempts >= 5) {
      return { valid: false, reason: 'Too many attempts' };
    }
    
    return { 
      valid: true, 
      otpId: otp._id,
      attemptsLeft: 5 - otp.attempts,
      expiresAt: otp.expiresAt
    };
  } catch (error) {
    console.error('OTP check error:', error);
    return { valid: false, reason: 'Check failed' };
  }
};

// Clean up expired OTPs (can be called periodically)
export const cleanupExpiredOTPs = async () => {
  try {
    const result = await OTP.cleanupExpired();
    console.log(`Cleaned up ${result.deletedCount} expired OTPs`);
    return result.deletedCount;
  } catch (error) {
    console.error('OTP cleanup error:', error);
    return 0;
  }
};

// Get OTP statistics for monitoring
export const getOTPStats = async () => {
  try {
    const stats = await OTP.aggregate([
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          used: { $sum: { $cond: ['$isUsed', 1, 0] } },
          expired: { 
            $sum: { 
              $cond: [
                { $lt: ['$expiresAt', new Date()] }, 
                1, 
                0
              ] 
            } 
          }
        }
      }
    ]);
    
    return stats;
  } catch (error) {
    console.error('OTP stats error:', error);
    return [];
  }
};

export default {
  generateOTP,
  createOTP,
  verifyOTP,
  checkOTP,
  cleanupExpiredOTPs,
  getOTPStats
};