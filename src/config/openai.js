import OpenAI from 'openai';
import { ApiError } from '../utils/ApiError.js';

// Initialize OpenAI client
let openaiClient = null;

const initializeOpenAI = () => {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
};

// Check if OpenAI is configured
export const isOpenAIConfigured = () => {
  return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here';
};

// Get OpenAI client
export const getOpenAIClient = () => {
  if (!isOpenAIConfigured()) {
    throw new ApiError(500, 'OpenAI API is not configured. Please set OPENAI_API_KEY in environment variables.');
  }
  
  return initializeOpenAI();
};

// Test OpenAI connection
export const testOpenAIConnection = async () => {
  try {
    if (!isOpenAIConfigured()) {
      return { configured: false, message: 'OpenAI API key not configured' };
    }

    const client = getOpenAIClient();
    
    // Test with a simple completion
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });

    return { 
      configured: true, 
      message: 'OpenAI connection successful',
      model: response.model
    };
  } catch (error) {
    console.error('OpenAI connection test failed:', error.message);
    return { 
      configured: false, 
      message: `OpenAI connection failed: ${error.message}` 
    };
  }
};

export default { getOpenAIClient, isOpenAIConfigured, testOpenAIConnection };