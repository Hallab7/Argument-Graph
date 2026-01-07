import { Router } from 'express';
import { getSystemHealth, cleanupOTPs } from './admin.controller.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import adminMiddleware from '../../middlewares/admin.middleware.js';

const router = Router();

/**
 * @swagger
 * /admin/health:
 *   get:
 *     summary: Get system health status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "System health check completed"
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "healthy"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     services:
 *                       type: object
 *                       properties:
 *                         database:
 *                           type: string
 *                           example: "connected"
 *                         email:
 *                           type: object
 *                           properties:
 *                             configured:
 *                               type: boolean
 *                             message:
 *                               type: string
 *                         ai:
 *                           type: object
 *                           properties:
 *                             openai:
 *                               type: object
 *                             gemini:
 *                               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/health', authMiddleware, adminMiddleware, getSystemHealth);

/**
 * @swagger
 * /admin/cleanup-otps:
 *   post:
 *     summary: Clean up expired OTPs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OTP cleanup completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Cleaned up 5 expired OTPs"
 *                 data:
 *                   type: object
 *                   properties:
 *                     cleanedCount:
 *                       type: number
 *                       example: 5
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/cleanup-otps', authMiddleware, adminMiddleware, cleanupOTPs);

export default router;