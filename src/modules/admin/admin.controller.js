import { ApiResponse, sendResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { testEmailConnection } from '../../config/email.js';
import { testOpenAIConnection } from '../../config/openai.js';
import { testGeminiConnection } from '../../config/gemini.js';
import { getOTPStats, cleanupExpiredOTPs } from '../../utils/otp.js';

export const getSystemHealth = async (req, res, next) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: 'connected', // We're here so DB is connected
        email: await testEmailConnection(),
        ai: {
          openai: await testOpenAIConnection(),
          gemini: await testGeminiConnection()
        }
      },
      otp: {
        stats: await getOTPStats()
      }
    };

    const response = ApiResponse.success(health, 'System health check completed');
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const cleanupOTPs = async (req, res, next) => {
  try {
    const cleanedCount = await cleanupExpiredOTPs();
    
    const response = ApiResponse.success(
      { cleanedCount },
      `Cleaned up ${cleanedCount} expired OTPs`
    );
    
    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};