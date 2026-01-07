import express from 'express';
import cors from 'cors';
import routes from './routes.js';
import errorMiddleware from './middlewares/error.middleware.js';
import { requestLogger } from './middlewares/logger.middleware.js';
import { generalRateLimiter } from './middlewares/rateLimiter.middleware.js';
import { swaggerUi, specs } from './config/swagger.js';

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with your frontend domain
    : ['http://localhost:3000', 'http://localhost:3001'], // Development origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use(requestLogger);

// Rate limiting
app.use('/api', generalRateLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Argument Graph API Documentation'
}));

// API routes
app.use('/api/v1', routes);

// 404 handler for undefined routes
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
    meta: {
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  });
});

// Global error handler
app.use(errorMiddleware);

export default app;