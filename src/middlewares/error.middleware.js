import { ApiError } from '../utils/ApiError.js';

export default (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(`Error ${err.message}:`, err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID format';
    error = new ApiError(400, message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    error = new ApiError(409, message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ApiError(400, message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new ApiError(401, message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new ApiError(401, message);
  }

  // Default to ApiError if not already
  if (!(error instanceof ApiError)) {
    error = new ApiError(
      error.statusCode || 500,
      error.message || 'Internal Server Error'
    );
  }

  res.status(error.statusCode).json({
    success: false,
    error: {
      message: error.message,
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
    meta: {
      timestamp: error.timestamp || new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  });
};