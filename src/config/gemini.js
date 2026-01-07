import { GoogleGenerativeAI } from '@google/generative-ai';
import { ApiError } from '../utils/ApiError.js';

// Initialize Gemini client
let geminiClient = null;

const initializeGemini = () => {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
};

// Check if Gemini is configured
export const isGeminiConfigured = () => {
  return !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here';
};

// Get Gemini client
export const getGeminiClient = () => {
  if (!isGeminiConfigured()) {
    throw new ApiError(500, 'Gemini API is not configured. Please set GEMINI_API_KEY in environment variables.');
  }
  
  return initializeGemini();
};

// Get Gemini model
export const getGeminiModel = (modelName = 'gemini-2.5-flash') => {
  const client = getGeminiClient();
  return client.getGenerativeModel({ model: modelName });
};

// Test Gemini connection
export const testGeminiConnection = async () => {
  try {
    if (!isGeminiConfigured()) {
      return { configured: false, message: 'Gemini API key not configured' };
    }

    const model = getGeminiModel();
    
    // Test with a simple prompt
    const result = await model.generateContent('Hello');
    const response = await result.response;
    const text = response.text();

    return { 
      configured: true, 
      message: 'Gemini connection successful',
      model: 'gemini-2.5-flash',
      testResponse: text.substring(0, 50) + '...'
    };
  } catch (error) {
    console.error('Gemini connection test failed:', error.message);
    return { 
      configured: false, 
      message: `Gemini connection failed: ${error.message}` 
    };
  }
};

// Generate content with Gemini
export const generateWithGemini = async (prompt, options = {}) => {
  try {
    const model = getGeminiModel(options.model);
    
    const generationConfig = {
      temperature: options.temperature || 0.3,
      topK: options.topK || 40,
      topP: options.topP || 0.95,
      maxOutputTokens: options.maxTokens || 2048,
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = await result.response;
    const text = response.text();

    return {
      text,
      usage: {
        promptTokens: result.response.usageMetadata?.promptTokenCount || 0,
        completionTokens: result.response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: result.response.usageMetadata?.totalTokenCount || 0
      }
    };
  } catch (error) {
    console.error('Gemini generation error:', error);
    throw new ApiError(500, `Gemini API error: ${error.message}`);
  }
};

export default { 
  getGeminiClient, 
  getGeminiModel, 
  isGeminiConfigured, 
  testGeminiConnection, 
  generateWithGemini 
};