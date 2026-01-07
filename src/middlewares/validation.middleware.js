import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Handle multipart form data by extracting text fields
      let bodyToValidate = req.body;
      
      // If it's multipart/form-data, req.body might have different structure
      if (req.is('multipart/form-data')) {
        // Extract only text fields for validation, ignore file fields
        bodyToValidate = {};
        for (const [key, value] of Object.entries(req.body)) {
          if (typeof value === 'string') {
            bodyToValidate[key] = value;
          }
        }
      }

      schema.parse({
        body: bodyToValidate,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return next(new ApiError(400, 'Validation failed', validationErrors));
      }
      next(error);
    }
  };
};