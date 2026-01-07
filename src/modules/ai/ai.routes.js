import { Router } from 'express';
import {
  testAIService,
  checkFallacies,
  factCheck,
  summarize,
  suggestCounter,
  analyzeArgumentStrength,
  getCacheStats,
  clearCache
} from './ai.controller.js';
import { cacheAIResponse, cacheTTL } from '../../middlewares/cache.middleware.js';

const router = Router();

/**
 * @swagger
 * /ai/test:
 *   get:
 *     summary: Test AI service connection
 *     tags: [AI Analysis]
 *     responses:
 *       200:
 *         description: AI service test results
 */
router.get('/test', testAIService);

/**
 * @swagger
 * /ai/check-fallacies:
 *   post:
 *     summary: Check text for logical fallacies
 *     tags: [AI Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to analyze for fallacies
 *     responses:
 *       200:
 *         description: Fallacy analysis results
 */
router.post('/check-fallacies', cacheAIResponse('fallacies', cacheTTL.long), checkFallacies);

/**
 * @swagger
 * /ai/fact-check:
 *   post:
 *     summary: Fact-check claims in text
 *     tags: [AI Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text containing claims to fact-check
 *     responses:
 *       200:
 *         description: Fact-check results
 */
router.post('/fact-check', cacheAIResponse('fact-check', cacheTTL.medium), factCheck);

/**
 * @swagger
 * /ai/summarize:
 *   post:
 *     summary: Summarize debate or argument content
 *     tags: [AI Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 description: Content to summarize
 *               maxLength:
 *                 type: integer
 *                 default: 200
 *                 description: Maximum summary length in words
 *               style:
 *                 type: string
 *                 enum: [brief, detailed, bullet_points]
 *                 default: brief
 *                 description: Summary style
 *     responses:
 *       200:
 *         description: Summary generated successfully
 */
router.post('/summarize', cacheAIResponse('summarize', cacheTTL.long), summarize);

/**
 * @swagger
 * /ai/suggest-counter:
 *   post:
 *     summary: Suggest counter-arguments
 *     tags: [AI Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [argument]
 *             properties:
 *               argument:
 *                 type: string
 *                 description: Argument to generate counter-arguments for
 *               context:
 *                 type: string
 *                 description: Additional context about the debate topic
 *               maxSuggestions:
 *                 type: integer
 *                 default: 3
 *                 description: Maximum number of counter-arguments to suggest
 *     responses:
 *       200:
 *         description: Counter-arguments generated successfully
 */
router.post('/suggest-counter', cacheAIResponse('counter-args', cacheTTL.medium), suggestCounter);

/**
 * @swagger
 * /ai/analyze-strength:
 *   post:
 *     summary: Analyze argument strength
 *     tags: [AI Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [argument]
 *             properties:
 *               argument:
 *                 type: string
 *                 description: Argument to analyze for strength
 *     responses:
 *       200:
 *         description: Argument strength analysis results
 */
router.post('/analyze-strength', cacheAIResponse('analyze-strength', cacheTTL.long), analyzeArgumentStrength);

/**
 * @swagger
 * /ai/cache/stats:
 *   get:
 *     summary: Get cache statistics
 *     tags: [AI Cache]
 *     responses:
 *       200:
 *         description: Cache statistics
 */
router.get('/cache/stats', getCacheStats);

/**
 * @swagger
 * /ai/cache/clear:
 *   post:
 *     summary: Clear AI response cache
 *     tags: [AI Cache]
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 */
router.post('/cache/clear', clearCache);

export default router;