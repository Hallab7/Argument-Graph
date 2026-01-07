export class ApiResponse {
  constructor(statusCode, data = null, message = 'Success', meta = {}) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.meta = {
      timestamp: new Date().toISOString(),
      ...meta
    };
  }

  static success(data = null, message = 'Success', statusCode = 200, meta = {}) {
    return new ApiResponse(statusCode, data, message, meta);
  }

  static created(data = null, message = 'Resource created successfully', meta = {}) {
    return new ApiResponse(201, data, message, meta);
  }

  static noContent(message = 'No content') {
    return new ApiResponse(204, null, message);
  }
}

export const sendResponse = (res, apiResponse) => {
  return res.status(apiResponse.statusCode).json(apiResponse);
};