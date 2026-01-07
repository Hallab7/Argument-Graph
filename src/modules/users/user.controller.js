import { UserService } from './user.service.js';
import { ApiResponse, sendResponse } from '../../utils/ApiResponse.js';

export const getUserProfile = async (req, res, next) => {
  try {
    const profile = await UserService.getUserProfile(req.params.id, req.userId);
    
    const response = ApiResponse.success(
      { user: profile },
      'User profile retrieved successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const profile = await UserService.updateUserProfile(
      req.params.id,
      req.body,
      req.userId
    );
    
    const response = ApiResponse.success(
      { user: profile },
      'User profile updated successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const getUserDebates = async (req, res, next) => {
  try {
    const result = await UserService.getUserDebates(req.params.id, req.query);
    
    const response = ApiResponse.success(
      result,
      'User debates retrieved successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const getUserStats = async (req, res, next) => {
  try {
    const stats = await UserService.getUserStats(req.params.id);
    
    const response = ApiResponse.success(
      stats,
      'User statistics retrieved successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const result = await UserService.searchUsers(req.query.q, req.query);
    
    const response = ApiResponse.success(
      result,
      'Users retrieved successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};