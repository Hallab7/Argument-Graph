import User from '../modules/users/user.model.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Middleware to check if user has admin privileges
 */
const adminMiddleware = async (req, res, next) => {
  try {
    // Check if user is authenticated (should be called after authMiddleware)
    if (!req.userId) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    // Get user details
    const user = await User.findById(req.userId);
    
    if (!user) {
      return next(ApiError.unauthorized('User not found'));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(ApiError.forbidden('Account is deactivated'));
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      return next(ApiError.forbidden('Admin access required'));
    }

    // Add user info to request for use in controllers
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    next(ApiError.internal('Authentication error'));
  }
};

/**
 * Middleware to check if user has moderator or admin privileges
 */
export const moderatorMiddleware = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.userId) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    // Get user details
    const user = await User.findById(req.userId);
    
    if (!user) {
      return next(ApiError.unauthorized('User not found'));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(ApiError.forbidden('Account is deactivated'));
    }

    // Check if user has moderator or admin role
    if (!['moderator', 'admin'].includes(user.role)) {
      return next(ApiError.forbidden('Moderator or admin access required'));
    }

    // Add user info to request
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Moderator middleware error:', error);
    next(ApiError.internal('Authentication error'));
  }
};

export default adminMiddleware;