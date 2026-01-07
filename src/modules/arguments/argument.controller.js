import { ArgumentService } from './argument.service.js';
import { ApiResponse, sendResponse } from '../../utils/ApiResponse.js';

export const createArgument = async (req, res, next) => {
  try {
    const argument = await ArgumentService.createArgument(
      req.params.debateId,
      req.body,
      req.userId
    );
    
    const response = ApiResponse.created(
      { argument },
      'Argument created successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const getArgument = async (req, res, next) => {
  try {
    const argument = await ArgumentService.getArgument(req.params.id, req.userId);
    
    const response = ApiResponse.success(
      { argument },
      'Argument retrieved successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const updateArgument = async (req, res, next) => {
  try {
    const argument = await ArgumentService.updateArgument(
      req.params.id,
      req.body,
      req.userId
    );
    
    const response = ApiResponse.success(
      { argument },
      'Argument updated successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const deleteArgument = async (req, res, next) => {
  try {
    const result = await ArgumentService.deleteArgument(req.params.id, req.userId);
    
    const response = ApiResponse.success(
      null,
      result.message
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const voteOnArgument = async (req, res, next) => {
  try {
    const result = await ArgumentService.voteOnArgument(
      req.params.id,
      req.body,
      req.userId
    );
    
    const response = ApiResponse.success(
      result,
      result.message
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const createConnection = async (req, res, next) => {
  try {
    const connection = await ArgumentService.createConnection(
      req.params.id,
      req.body,
      req.userId
    );
    
    const response = ApiResponse.created(
      { connection },
      'Connection created successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const rateArgument = async (req, res, next) => {
  try {
    const rating = await ArgumentService.rateArgument(
      req.params.id,
      req.body,
      req.userId
    );
    
    const response = ApiResponse.success(
      { rating },
      'Argument rated successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const getArgumentRatings = async (req, res, next) => {
  try {
    const result = await ArgumentService.getArgumentRatings(req.params.id, req.userId);
    
    const response = ApiResponse.success(
      result,
      'Argument ratings retrieved successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const getArgumentAnalysis = async (req, res, next) => {
  try {
    const analysis = await ArgumentService.getArgumentAnalysis(req.params.id, req.userId);
    
    const response = ApiResponse.success(
      analysis,
      'Argument analysis retrieved successfully'
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};