import { AuthService } from './auth.service.js';
import { ApiResponse, sendResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

export const register = async (req, res, next) => {
  try {
    const result = await AuthService.register(req.body);
    
    const response = ApiResponse.created(
      {
        user: result.user,
        token: result.token
      },
      'User registered successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await AuthService.login(req.body);
    
    const response = ApiResponse.success(
      {
        user: result.user,
        token: result.token
      },
      'Login successful'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await AuthService.getCurrentUser(req.userId);
    
    const response = ApiResponse.success(
      { user },
      'User profile retrieved successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = await AuthService.updateProfile(req.userId, req.body, req.file);
    
    const response = ApiResponse.success(
      { user },
      'Profile updated successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(ApiError.badRequest('No image file provided'));
    }

    const result = await AuthService.uploadAvatar(req.userId, req.file.buffer);
    
    const response = ApiResponse.success(
      result,
      'Avatar uploaded successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const removeAvatar = async (req, res, next) => {
  try {
    const result = await AuthService.removeAvatar(req.userId);
    
    const response = ApiResponse.success(
      null,
      result.message
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const result = await AuthService.changePassword(req.userId, req.body);
    
    const response = ApiResponse.success(
      null,
      result.message
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // In a more advanced system, you might blacklist the token
    
    const response = ApiResponse.success(
      null,
      'Logged out successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const { password, confirmation } = req.body;
    
    // Validate required fields
    if (!password || !confirmation) {
      return next(ApiError.badRequest('Password and confirmation are required'));
    }
    
    // Validate confirmation text
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return next(ApiError.badRequest('Confirmation must be exactly "DELETE_MY_ACCOUNT"'));
    }
    
    const result = await AuthService.deleteAccount(req.userId, password);
    
    const response = ApiResponse.success(
      result,
      'Account deleted successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};