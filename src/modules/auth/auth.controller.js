import { AuthService } from './auth.service.js';
import { ApiResponse, sendResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

export const register = async (req, res, next) => {
  try {
    const result = await AuthService.register(req.body);
    
    const response = ApiResponse.created(
      {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken
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
        token: result.token,
        refreshToken: result.refreshToken
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

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return next(ApiError.badRequest('Refresh token is required'));
    }
    
    const result = await AuthService.refreshToken(refreshToken);
    
    const response = ApiResponse.success(
      {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken
      },
      'Token refreshed successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return next(ApiError.badRequest('Email is required'));
    }
    
    const result = await AuthService.forgotPassword(email);
    
    const response = ApiResponse.success(
      {
        sent: result.sent,
        expiresIn: result.expiresIn
      },
      result.message
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const verifyResetOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return next(ApiError.badRequest('Email and OTP are required'));
    }
    
    const result = await AuthService.verifyResetOTP(email, otp);
    
    const response = ApiResponse.success(
      {
        resetToken: result.resetToken,
        email: result.email
      },
      result.message
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    
    if (!resetToken || !newPassword) {
      return next(ApiError.badRequest('Reset token and new password are required'));
    }
    
    const result = await AuthService.resetPassword(resetToken, newPassword);
    
    const response = ApiResponse.success(
      {
        email: result.email
      },
      result.message
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const checkUsernameAvailability = async (req, res, next) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return next(ApiError.badRequest('Username parameter is required'));
    }
    
    const result = await AuthService.checkUsernameAvailability(username);
    
    const response = ApiResponse.success(
      result,
      result.message
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};