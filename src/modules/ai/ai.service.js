import { ApiError } from '../../utils/ApiError.js';
import { getOpenAIClient, isOpenAIConfigured } from '../../config/openai.js';
import { generateWithGemini, isGeminiConfigured, testGeminiConnection } from '../../config/gemini.js';
import { testOpenAIConnection } from '../../config/openai.js';
import { 
  FALLACY_DETECTION_PROMPT, 
  FACT_CHECK_PROMPT, 
  SUMMARIZATION_PROMPT, 
  COUNTER_ARGUMENT_PROMPT, 
  ARGUMENT_STRENGTH_PROMPT,
  formatPrompt 
} from '../../utils/aiPrompts.js';

// Helper function to parse AI response JSON
const parseAIResponse = (responseText) => {
  // Handle empty or incomplete responses
  if (!responseText || responseText.trim().length === 0) {
    throw new Error('Empty response from AI');
  }
  
  if (responseText.trim() === '{' || responseText.trim() === '}') {
    throw new Error('Incomplete JSON response from AI');
  }

  try {
    // First try direct JSON parsing
    return JSON.parse(responseText);
  } catch (parseError) {
    // If that fails, try to extract JSON from the response
    let jsonText = responseText.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    
    // Remove any leading/trailing text that's not JSON
    jsonText = jsonText.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    
    // Check if we have a complete JSON object
    if (!jsonText.includes('{') || !jsonText.includes('}')) {
      throw new Error('No complete JSON object found in response');
    }
    
    // Try parsing the cleaned text
    try {
      return JSON.parse(jsonText);
    } catch (secondParseError) {
      // Try to find JSON object in the text using a more flexible regex
      const jsonMatch = jsonText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (thirdParseError) {
          console.error('JSON parsing failed. Raw response:', responseText);
          console.error('Cleaned text:', jsonText);
          throw new Error('Invalid JSON response from AI');
        }
      } else {
        console.error('No JSON found in response. Raw response:', responseText);
        throw new Error('No valid JSON found in AI response');
      }
    }
  }
};

// AI Provider selection logic
const getAvailableProvider = () => {
  if (isGeminiConfigured()) {
    return 'gemini';
  } else if (isOpenAIConfigured()) {
    return 'openai';
  }
  return null;
};

// Generate content using available AI provider
const generateContent = async (prompt, options = {}) => {
  const provider = getAvailableProvider();
  
  if (!provider) {
    throw ApiError.serviceUnavailable('No AI service is configured. Please set GEMINI_API_KEY or OPENAI_API_KEY.');
  }

  try {
    if (provider === 'gemini') {
      return await generateWithGemini(prompt, {
        temperature: options.temperature || 0.3,
        maxTokens: options.maxTokens || 1024
      });
    } else if (provider === 'openai') {
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: options.systemMessage || 'You are a helpful AI assistant. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature || 0.3
      });

      return {
        text: response.choices[0].message.content,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        },
        model: response.model
      };
    }
  } catch (error) {
    // If primary provider fails and we have a fallback, try it
    if (provider === 'gemini' && isOpenAIConfigured()) {
      console.log('Gemini failed, falling back to OpenAI:', error.message);
      try {
        const client = getOpenAIClient();
        const response = await client.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: options.systemMessage || 'You are a helpful AI assistant. Respond only with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature || 0.3
        });

        return {
          text: response.choices[0].message.content,
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0
          },
          model: response.model,
          fallback: true
        };
      } catch (fallbackError) {
        console.error('Both Gemini and OpenAI failed:', fallbackError.message);
        throw ApiError.internalError(`AI service error: ${error.message}`);
      }
    }
    
    throw ApiError.internalError(`AI service error: ${error.message}`);
  }
};

export class AIService {
  // Test AI service connection
  static async testConnection() {
    const results = {};
    
    if (isGeminiConfigured()) {
      results.gemini = await testGeminiConnection();
    }
    
    if (isOpenAIConfigured()) {
      results.openai = await testOpenAIConnection();
    }

    const provider = getAvailableProvider();
    
    return {
      primaryProvider: provider,
      availableProviders: Object.keys(results),
      results,
      configured: !!provider
    };
  }

  static async checkFallacies(text) {
    if (!text || text.trim().length < 10) {
      throw ApiError.badRequest('Text must be at least 10 characters long');
    }

    try {
      const prompt = formatPrompt(FALLACY_DETECTION_PROMPT, { text });
      const result = await generateContent(prompt, {
        systemMessage: 'You are an expert in logical reasoning and critical thinking. Respond only with valid JSON.',
        maxTokens: 1000,
        temperature: 0.3
      });

      const aiResponse = parseAIResponse(result.text);
      const fallacies = aiResponse.fallacies || [];

      return {
        text,
        fallacies: fallacies.map(fallacy => ({
          type: fallacy.type,
          confidence: fallacy.confidence,
          explanation: fallacy.explanation,
          textExcerpt: fallacy.text_excerpt,
          location: { start: 0, end: text.length }
        })),
        analysis: {
          totalFallacies: fallacies.length,
          averageConfidence: fallacies.length > 0 
            ? fallacies.reduce((sum, f) => sum + f.confidence, 0) / fallacies.length 
            : 0,
          analyzedAt: new Date(),
          model: result.model || getAvailableProvider(),
          tokensUsed: result.usage?.totalTokens || 0,
          provider: result.fallback ? 'openai-fallback' : getAvailableProvider()
        }
      };
    } catch (error) {
      console.error('AI fallacy detection error:', error);
      if (error.message.includes('JSON')) {
        throw ApiError.internalError('Failed to parse AI response. Please try again.');
      }
      throw ApiError.internalError(`AI service error: ${error.message}`);
    }
  }

  static async factCheck(text) {
    if (!text || text.trim().length < 10) {
      throw ApiError.badRequest('Text must be at least 10 characters long');
    }

    try {
      const prompt = formatPrompt(FACT_CHECK_PROMPT, { text });
      const result = await generateContent(prompt, {
        systemMessage: 'You are a fact-checking expert. Respond only with valid JSON.',
        maxTokens: 1500,
        temperature: 0.2
      });

      const aiResponse = parseAIResponse(result.text);
      const claims = aiResponse.claims || [];

      return {
        text,
        claims: claims.map(claim => ({
          claim: claim.claim,
          verdict: claim.verdict,
          confidence: claim.confidence,
          reasoning: claim.reasoning,
          sources: claim.suggested_sources?.map(source => ({
            title: source,
            url: null,
            reliability: 0.7
          })) || []
        })),
        summary: {
          totalClaims: claims.length,
          verifiableClaims: claims.filter(c => c.verdict !== 'unverifiable').length,
          trueClaims: claims.filter(c => c.verdict === 'true').length,
          falseClaims: claims.filter(c => c.verdict === 'false').length,
          analyzedAt: new Date(),
          model: result.model || getAvailableProvider(),
          tokensUsed: result.usage?.totalTokens || 0,
          provider: result.fallback ? 'openai-fallback' : getAvailableProvider()
        }
      };
    } catch (error) {
      console.error('AI fact-check error:', error);
      if (error.message.includes('JSON')) {
        throw ApiError.internalError('Failed to parse AI response. Please try again.');
      }
      throw ApiError.internalError(`AI service error: ${error.message}`);
    }
  }

  static async summarize(content, options = {}) {
    const { maxLength = 200, style = 'brief' } = options;

    if (!content || content.trim().length < 50) {
      throw ApiError.badRequest('Content must be at least 50 characters long');
    }

    try {
      const prompt = formatPrompt(SUMMARIZATION_PROMPT, { 
        content, 
        maxLength, 
        style 
      });

      const result = await generateContent(prompt, {
        systemMessage: 'You are a helpful assistant. Respond with valid JSON only.',
        maxTokens: 1000,
        temperature: 0.1
      });

      const aiResponse = parseAIResponse(result.text);
      const summary = aiResponse.summary || '';
      const keyPoints = aiResponse.key_points || [];

      return {
        originalContent: content,
        summary,
        keyPoints,
        wordCount: summary.split(' ').length,
        compressionRatio: summary.split(' ').length / content.split(' ').length,
        style,
        analyzedAt: new Date(),
        model: result.model || getAvailableProvider(),
        tokensUsed: result.usage?.totalTokens || 0,
        provider: result.fallback ? 'openai-fallback' : getAvailableProvider()
      };
    } catch (error) {
      console.error('AI summarization error:', error);
      if (error.message.includes('JSON')) {
        throw ApiError.internalError('Failed to parse AI response. Please try again.');
      }
      throw ApiError.internalError(`AI service error: ${error.message}`);
    }
  }

  static async suggestCounter(argument, options = {}) {
    const { context, maxSuggestions = 3 } = options;

    if (!argument || argument.trim().length < 20) {
      throw ApiError.badRequest('Argument must be at least 20 characters long');
    }

    try {
      const prompt = formatPrompt(COUNTER_ARGUMENT_PROMPT, { 
        argument, 
        context: context || 'No additional context provided',
        maxSuggestions 
      });

      const result = await generateContent(prompt, {
        systemMessage: 'You are a skilled debater and critical thinker. Respond only with valid JSON.',
        maxTokens: 2000,
        temperature: 0.4
      });

      const aiResponse = parseAIResponse(result.text);
      const counterArguments = aiResponse.counter_arguments || [];

      return {
        originalArgument: argument,
        context: context || null,
        counterArguments: counterArguments.map(ca => ({
          argument: ca.argument,
          strength: ca.strength,
          type: ca.type,
          supportingEvidence: ca.supporting_evidence || []
        })),
        metadata: {
          totalSuggestions: counterArguments.length,
          averageStrength: counterArguments.length > 0 
            ? counterArguments.reduce((sum, ca) => sum + ca.strength, 0) / counterArguments.length 
            : 0,
          analyzedAt: new Date(),
          model: result.model || getAvailableProvider(),
          tokensUsed: result.usage?.totalTokens || 0,
          provider: result.fallback ? 'openai-fallback' : getAvailableProvider()
        }
      };
    } catch (error) {
      console.error('AI counter-argument error:', error);
      if (error.message.includes('JSON')) {
        throw ApiError.internalError('Failed to parse AI response. Please try again.');
      }
      throw ApiError.internalError(`AI service error: ${error.message}`);
    }
  }

  static async analyzeArgumentStrength(argument) {
    if (!argument || argument.trim().length < 20) {
      throw ApiError.badRequest('Argument must be at least 20 characters long');
    }

    try {
      const prompt = formatPrompt(ARGUMENT_STRENGTH_PROMPT, { argument });

      const result = await generateContent(prompt, {
        systemMessage: 'You are an expert in argumentation and critical thinking. Respond only with valid JSON.',
        maxTokens: 2000,
        temperature: 0.3
      });

      const aiResponse = parseAIResponse(result.text);

      const analysis = {
        overallStrength: aiResponse.overall_strength || 0.5,
        criteria: {
          logic: aiResponse.criteria_scores?.logic || 0.5,
          evidence: aiResponse.criteria_scores?.evidence || 0.5,
          relevance: aiResponse.criteria_scores?.relevance || 0.5,
          clarity: aiResponse.criteria_scores?.clarity || 0.5
        },
        strengths: aiResponse.strengths || [],
        weaknesses: aiResponse.weaknesses || [],
        suggestions: aiResponse.suggestions || []
      };

      return {
        argument,
        analysis,
        analyzedAt: new Date(),
        model: result.model || getAvailableProvider(),
        tokensUsed: result.usage?.totalTokens || 0,
        provider: result.fallback ? 'openai-fallback' : getAvailableProvider()
      };
    } catch (error) {
      console.error('AI argument strength error:', error);
      if (error.message.includes('JSON')) {
        throw ApiError.internalError('Failed to parse AI response. Please try again.');
      }
      throw ApiError.internalError(`AI service error: ${error.message}`);
    }
  }
}