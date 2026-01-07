import jwt from 'jsonwebtoken';
import { ApiError } from './ApiError.js';

export const signToken = (userId, expiresIn = process.env.JWT_EXPIRES_IN) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign(
    { 
      id: userId,
      iat: Math.floor(Date.now() / 1000)
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn
    }
  );
};

export const verifyToken = (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid token');
    }
    throw ApiError.unauthorized('Token verification failed');
  }
};

export const signRefreshToken = (userId) => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
  }

  return jwt.sign(
    { 
      id: userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    }, 
    process.env.JWT_REFRESH_SECRET, 
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    }
  );
};

export const verifyRefreshToken = (token) => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw ApiError.unauthorized('Invalid refresh token');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Refresh token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid refresh token');
    }
    throw ApiError.unauthorized('Refresh token verification failed');
  }
};