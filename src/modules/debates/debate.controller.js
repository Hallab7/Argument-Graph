import { DebateService } from './debate.service.js';
import { ApiResponse, sendResponse } from '../../utils/ApiResponse.js';

export const createDebate = async (req, res, next) => {
  try {
    const debate = await DebateService.createDebate(req.body, req.userId);
    
    const response = ApiResponse.created(
      { debate },
      'Debate created successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const getDebates = async (req, res, next) => {
  try {
    const result = await DebateService.getDebates(req.query);
    
    const response = ApiResponse.success(
      result,
      'Debates retrieved successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const getDebateById = async (req, res, next) => {
  try {
    const debate = await DebateService.getDebateById(req.params.id, req.userId);
    
    const response = ApiResponse.success(
      { debate },
      'Debate retrieved successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const updateDebate = async (req, res, next) => {
  try {
    const debate = await DebateService.updateDebate(req.params.id, req.body, req.userId);
    
    const response = ApiResponse.success(
      { debate },
      'Debate updated successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const deleteDebate = async (req, res, next) => {
  try {
    const result = await DebateService.deleteDebate(req.params.id, req.userId);
    
    const response = ApiResponse.success(
      null,
      result.message
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const getDebateGraph = async (req, res, next) => {
  try {
    const graph = await DebateService.getDebateGraph(req.params.id, req.userId);
    
    const response = ApiResponse.success(
      graph,
      'Debate graph retrieved successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const joinDebate = async (req, res, next) => {
  try {
    const result = await DebateService.joinDebate(req.params.id, req.userId);
    
    const response = ApiResponse.success(
      null,
      result.message
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};