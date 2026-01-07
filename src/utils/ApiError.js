export class ApiError extends Error {
  constructor(statusCode, message, details = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', details = null) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized', details = null) {
    return new ApiError(401, message, details);
  }

  static forbidden(message = 'Forbidden', details = null) {
    return new ApiError(403, message, details);
  }

  static notFound(message = 'Resource not found', details = null) {
    return new ApiError(404, message, details);
  }

  static conflict(message = 'Conflict', details = null) {
    return new ApiError(409, message, details);
  }

  static unprocessableEntity(message = 'Unprocessable Entity', details = null) {
    return new ApiError(422, message, details);
  }

  static internal(message = 'Internal Server Error', details = null) {
    return new ApiError(500, message, details);
  }

  static internalError(message = 'Internal Server Error', details = null) {
    return new ApiError(500, message, details);
  }

  static serviceUnavailable(message = 'Service Unavailable', details = null) {
    return new ApiError(503, message, details);
  }
}