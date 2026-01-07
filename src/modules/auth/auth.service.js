import User from '../users/user.model.js';
import Debate from '../debates/debate.model.js';
import Argument from '../arguments/argument.model.js';
import Rating from '../ratings/rating.model.js';
import Connection from '../connections/connection.model.js';
import bcrypt from 'bcrypt';
import { signToken, verifyToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { ApiError } from '../../utils/ApiError.js';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId, isCloudinaryConfigured } from '../../config/cloudinary.js';
import { createOTP, verifyOTP } from '../../utils/otp.js';
import { sendEmail, emailTemplates, isEmailConfigured } from '../../config/email.js';

export class AuthService {
  static async register(userData) {
    const { email, username, password } = userData;

    // Normalize username to lowercase
    const normalizedUsername = username.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email }, 
        { username: normalizedUsername }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw ApiError.conflict('Email already registered');
      }
      if (existingUser.username === normalizedUsername) {
        throw ApiError.conflict('Username already taken');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with normalized username
    const user = await User.create({
      email,
      username: normalizedUsername,
      password: hashedPassword
    });

    // Generate tokens
    const token = signToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      user: userResponse,
      token,
      refreshToken
    };
  }

  static async login(credentials) {
    const { email, password } = credentials;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = signToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      user: userResponse,
      token,
      refreshToken
    };
  }

  static async getCurrentUser(userId) {
    const user = await User.findById(userId);
    
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user;
  }

  static async updateProfile(userId, updateData, avatarFile = null) {
    const { username } = updateData;

    // Check if new username already exists (case-insensitive)
    if (username) {
      const normalizedUsername = username.toLowerCase().trim();
      
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        username: normalizedUsername
      });

      if (existingUser) {
        throw ApiError.conflict('Username already taken');
      }
      
      // Update the username in updateData to normalized version
      updateData.username = normalizedUsername;
    }

    // Handle avatar upload if provided
    let avatarUpdate = {};
    if (avatarFile) {
      try {
        // Check if Cloudinary is configured
        if (!isCloudinaryConfigured()) {
          throw ApiError.badRequest('Avatar upload is not available. Image service is not configured.');
        }

        // Get current user to check for existing avatar
        const currentUser = await User.findById(userId).select('+avatar_public_id');
        
        // Delete existing avatar if it exists
        if (currentUser.avatar_public_id) {
          try {
            await deleteFromCloudinary(currentUser.avatar_public_id);
          } catch (error) {
            console.warn('Failed to delete existing avatar:', error.message);
          }
        }

        // Upload new avatar to Cloudinary
        const uploadResult = await uploadToCloudinary(avatarFile.buffer, {
          public_id: `user_${userId}_${Date.now()}`,
          folder: 'argument-graph/avatars'
        });

        avatarUpdate = {
          avatar_url: uploadResult.secure_url,
          avatar_public_id: uploadResult.public_id
        };
      } catch (error) {
        console.error('Avatar upload error:', error);
        
        if (error instanceof ApiError) {
          throw error;
        }
        
        throw ApiError.internal('Failed to upload avatar');
      }
    }

    // Combine username and avatar updates
    const finalUpdateData = {
      ...updateData,
      ...avatarUpdate
    };

    // Remove email from update data if it exists (security measure)
    delete finalUpdateData.email;

    const user = await User.findByIdAndUpdate(
      userId,
      finalUpdateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user;
  }

  static async uploadAvatar(userId, fileBuffer) {
    try {
      // Check if Cloudinary is configured
      if (!isCloudinaryConfigured()) {
        throw ApiError.badRequest('Avatar upload is not available. Image service is not configured.');
      }

      // Get current user to check for existing avatar
      const user = await User.findById(userId).select('+avatar_public_id');
      
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Delete existing avatar if it exists
      if (user.avatar_public_id) {
        try {
          await deleteFromCloudinary(user.avatar_public_id);
        } catch (error) {
          console.warn('Failed to delete existing avatar:', error.message);
          // Continue with upload even if deletion fails
        }
      }

      // Upload new avatar to Cloudinary
      const uploadResult = await uploadToCloudinary(fileBuffer, {
        public_id: `user_${userId}_${Date.now()}`, // Unique public ID
        folder: 'argument-graph/avatars'
      });

      // Update user with new avatar URL and public ID
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          avatar_url: uploadResult.secure_url,
          avatar_public_id: uploadResult.public_id
        },
        { new: true, runValidators: true }
      );

      return {
        avatar_url: updatedUser.avatar_url,
        message: 'Avatar uploaded successfully'
      };

    } catch (error) {
      console.error('Avatar upload error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internal('Failed to upload avatar');
    }
  }

  static async removeAvatar(userId) {
    try {
      // Get current user to check for existing avatar
      const user = await User.findById(userId).select('+avatar_public_id');
      
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      if (!user.avatar_url) {
        throw ApiError.badRequest('No avatar to remove');
      }

      // Delete avatar from Cloudinary if public_id exists and Cloudinary is configured
      if (user.avatar_public_id) {
        try {
          await deleteFromCloudinary(user.avatar_public_id);
        } catch (error) {
          console.warn('Failed to delete avatar from Cloudinary:', error.message);
          // Continue with database update even if Cloudinary deletion fails
        }
      }

      // Remove avatar URL and public ID from user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $unset: {
            avatar_url: 1,
            avatar_public_id: 1
          }
        },
        { new: true }
      );

      return {
        message: 'Avatar removed successfully'
      };

    } catch (error) {
      console.error('Avatar removal error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internal('Failed to remove avatar');
    }
  }

  static async changePassword(userId, passwords) {
    const { currentPassword, newPassword } = passwords;

    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    user.password = hashedNewPassword;
    await user.save();

    return { message: 'Password updated successfully' };
  }

  static async deleteAccount(userId, password) {
    try {
      // Get user with password for verification
      const user = await User.findById(userId).select('+password +avatar_public_id');
      
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        throw ApiError.unauthorized('Invalid password');
      }

      // Start collecting deletion statistics
      const deletionStats = {
        user: false,
        debates: 0,
        arguments: 0,
        ratings: 0,
        connections: 0
      };

      // Delete user's ratings first (to avoid foreign key issues)
      const deletedRatings = await Rating.deleteMany({ rater: userId });
      deletionStats.ratings = deletedRatings.deletedCount;

      // Delete connections created by the user
      const deletedConnections = await Connection.deleteMany({ createdBy: userId });
      deletionStats.connections = deletedConnections.deletedCount;

      // Delete user's arguments (this will also remove connections referencing these arguments)
      const userArguments = await Argument.find({ author: userId });
      const argumentIds = userArguments.map(arg => arg._id);
      
      // Delete connections that reference user's arguments
      if (argumentIds.length > 0) {
        const deletedArgumentConnections = await Connection.deleteMany({
          $or: [
            { sourceArgument: { $in: argumentIds } },
            { targetArgument: { $in: argumentIds } }
          ]
        });
        deletionStats.connections += deletedArgumentConnections.deletedCount;

        // Delete ratings for user's arguments
        const deletedArgumentRatings = await Rating.deleteMany({ 
          argument: { $in: argumentIds } 
        });
        deletionStats.ratings += deletedArgumentRatings.deletedCount;
      }

      // Delete user's arguments
      const deletedArguments = await Argument.deleteMany({ author: userId });
      deletionStats.arguments = deletedArguments.deletedCount;

      // Delete user's debates
      const deletedDebates = await Debate.deleteMany({ creator: userId });
      deletionStats.debates = deletedDebates.deletedCount;

      // Clean up avatar from Cloudinary if it exists
      if (user.avatar_public_id && isCloudinaryConfigured()) {
        try {
          await deleteFromCloudinary(user.avatar_public_id);
        } catch (error) {
          console.warn('Failed to delete avatar from Cloudinary:', error.message);
          // Continue with account deletion even if avatar cleanup fails
        }
      }

      // Finally, delete the user account
      await User.findByIdAndDelete(userId);
      deletionStats.user = true;

      return {
        message: 'Account deleted successfully',
        deletedAt: new Date(),
        deletedData: deletionStats
      };

    } catch (error) {
      console.error('Account deletion error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internal('Failed to delete account. Please try again.');
    }
  }

  static async refreshToken(refreshTokenString) {
    try {
      // Verify the refresh token
      const decoded = verifyRefreshToken(refreshTokenString);
      
      // Get the user
      const user = await User.findById(decoded.id);
      
      if (!user) {
        throw ApiError.unauthorized('User not found');
      }
      
      // Generate new access token
      const newToken = signToken(user._id);
      
      // Optionally generate new refresh token (rotate refresh tokens)
      const newRefreshToken = signRefreshToken(user._id);
      
      return {
        token: newToken,
        refreshToken: newRefreshToken,
        user: user.toObject()
      };
      
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.unauthorized('Invalid refresh token');
    }
  }

  static async forgotPassword(email) {
    try {
      // Check if email service is configured
      if (!isEmailConfigured()) {
        throw ApiError.serviceUnavailable('Email service is not configured. Password reset is not available.');
      }

      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        // For security, don't reveal if email exists or not
        return {
          message: 'If an account with this email exists, you will receive a password reset OTP.',
          sent: false
        };
      }

      // Generate OTP
      const otpExpiresIn = parseInt(process.env.OTP_EXPIRES_IN) || 10;
      const otpData = await createOTP(email, 'password_reset', otpExpiresIn);

      // Send OTP email
      const emailTemplate = emailTemplates.otpVerification(otpData.otp, otpExpiresIn);
      await sendEmail(email, emailTemplate.subject, emailTemplate.html);

      return {
        message: 'Password reset OTP has been sent to your email address.',
        sent: true,
        expiresIn: otpExpiresIn
      };

    } catch (error) {
      console.error('Forgot password error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internalError('Failed to process password reset request');
    }
  }

  static async verifyResetOTP(email, otp) {
    try {
      // Verify the OTP
      const verification = await verifyOTP(email, otp, 'password_reset');
      
      if (!verification.success) {
        throw ApiError.badRequest('Invalid or expired OTP');
      }

      // Generate a temporary reset token (valid for 15 minutes)
      const resetToken = signToken(verification.email, '15m');

      return {
        message: 'OTP verified successfully. You can now reset your password.',
        resetToken,
        email: verification.email
      };

    } catch (error) {
      console.error('OTP verification error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internalError('Failed to verify OTP');
    }
  }

  static async resetPassword(resetToken, newPassword) {
    try {
      // Verify the reset token
      let decoded;
      try {
        decoded = verifyToken(resetToken);
      } catch (tokenError) {
        throw ApiError.unauthorized('Invalid or expired reset token');
      }

      // Find user by email (the token contains email as id for reset tokens)
      const user = await User.findOne({ email: decoded.id });
      
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user password
      user.password = hashedPassword;
      await user.save();

      // Send confirmation email
      if (isEmailConfigured()) {
        try {
          const emailTemplate = emailTemplates.passwordResetSuccess();
          await sendEmail(user.email, emailTemplate.subject, emailTemplate.html);
        } catch (emailError) {
          console.warn('Failed to send password reset confirmation email:', emailError.message);
          // Don't fail the password reset if email fails
        }
      }

      return {
        message: 'Password has been reset successfully. You can now log in with your new password.',
        email: user.email
      };

    } catch (error) {
      console.error('Password reset error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internalError('Failed to reset password');
    }
  }

  static async checkUsernameAvailability(username) {
    try {
      // Convert username to lowercase for case-insensitive check
      const normalizedUsername = username.toLowerCase().trim();
      
      // Validate username format
      if (!normalizedUsername) {
        throw ApiError.badRequest('Username is required');
      }
      
      if (normalizedUsername.length < 3) {
        throw ApiError.badRequest('Username must be at least 3 characters');
      }
      
      if (normalizedUsername.length > 30) {
        throw ApiError.badRequest('Username must not exceed 30 characters');
      }
      
      if (!/^[a-zA-Z0-9_]+$/.test(normalizedUsername)) {
        throw ApiError.badRequest('Username can only contain letters, numbers, and underscores');
      }
      
      // Check if username exists (case-insensitive)
      const existingUser = await User.findOne({ 
        username: normalizedUsername 
      });
      
      const isAvailable = !existingUser;
      
      return {
        username: normalizedUsername,
        available: isAvailable,
        message: isAvailable 
          ? 'Username is available' 
          : 'Username is already taken'
      };
      
    } catch (error) {
      console.error('Username availability check error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internal('Failed to check username availability');
    }
  }
}