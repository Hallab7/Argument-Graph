import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import User from '../modules/users/user.model.js';

export default async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next(ApiError.unauthorized('Access token is required'));
    }

    if (!authHeader.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('Invalid token format. Use Bearer <token>'));
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next(ApiError.unauthorized('Access token is required'));
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return next(ApiError.unauthorized('User no longer exists'));
    }

    if (!user.isActive) {
      return next(ApiError.unauthorized('User account is deactivated'));
    }

    if (user.isLocked) {
      return next(ApiError.unauthorized('User account is temporarily locked'));
    }

    // Add user to request object
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    next(error);
  }
};

// Role-based access control middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }

    next();
  };
};