import { v4 as uuidv4 } from 'uuid';

export const requestLogger = (req, res, next) => {
  // Generate unique request ID
  req.requestId = uuidv4();
  
  // Log request
  const start = Date.now();
  const { method, url, ip } = req;
  
  console.log(`[${new Date().toISOString()}] ${req.requestId} ${method} ${url} - ${ip}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    console.log(`[${new Date().toISOString()}] ${req.requestId} ${method} ${url} - ${statusCode} - ${duration}ms`);
  });
  
  next();
};