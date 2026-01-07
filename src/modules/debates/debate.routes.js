import { Router } from 'express';
import {
  createDebate,
  getDebates,
  getDebateById,
  updateDebate,
  deleteDebate,
  getDebateGraph,
  joinDebate
} from './debate.controller.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validation.middleware.js';
import { 
  createDebateSchema, 
  updateDebateSchema, 
  debateQuerySchema 
} from './debate.schema.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Debate:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Debate ID
 *         title:
 *           type: string
 *           description: Debate title
 *         description:
 *           type: string
 *           description: Debate description
 *         creator:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             username:
 *               type: string
 *             avatar_url:
 *               type: string
 *             reputation:
 *               type: number
 *         status:
 *           type: string
 *           enum: [active, closed, archived]
 *           description: Debate status
 *         category:
 *           type: string
 *           description: Debate category
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         argumentCount:
 *           type: number
 *         viewCount:
 *           type: number
 *         isPublic:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /debates:
 *   get:
 *     summary: Get all debates
 *     tags: [Debates]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of debates per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, closed, archived]
 *         description: Filter by debate status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *     responses:
 *       200:
 *         description: List of debates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     debates:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Debate'
 *                     pagination:
 *                       type: object
 */
router.get('/', validate(debateQuerySchema), getDebates);

/**
 * @swagger
 * /debates:
 *   post:
 *     summary: Create a new debate
 *     tags: [Debates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *               category:
 *                 type: string
 *                 maxLength: 50
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Debate created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, validate(createDebateSchema), createDebate);

/**
 * @swagger
 * /debates/{id}:
 *   get:
 *     summary: Get debate by ID
 *     tags: [Debates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Debate ID
 *     responses:
 *       200:
 *         description: Debate details
 *       404:
 *         description: Debate not found
 */
router.get('/:id', getDebateById);

/**
 * @swagger
 * /debates/{id}:
 *   put:
 *     summary: Update debate
 *     tags: [Debates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, closed, archived]
 *     responses:
 *       200:
 *         description: Debate updated successfully
 *       403:
 *         description: Only debate creator can update
 */
router.put('/:id', authMiddleware, validate(updateDebateSchema), updateDebate);

/**
 * @swagger
 * /debates/{id}:
 *   delete:
 *     summary: Delete debate
 *     tags: [Debates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Debate deleted successfully
 *       403:
 *         description: Only debate creator can delete
 */
router.delete('/:id', authMiddleware, deleteDebate);

/**
 * @swagger
 * /debates/{id}/graph:
 *   get:
 *     summary: Get debate argument graph
 *     tags: [Debates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Debate ID
 *     responses:
 *       200:
 *         description: Argument graph data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 debate:
 *                   type: object
 *                 graph:
 *                   type: object
 *                   properties:
 *                     nodes:
 *                       type: array
 *                     edges:
 *                       type: array
 *                 stats:
 *                   type: object
 */
router.get('/:id/graph', getDebateGraph);

/**
 * @swagger
 * /debates/{id}/join:
 *   post:
 *     summary: Join a debate
 *     tags: [Debates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully joined debate
 *       400:
 *         description: Already a participant or debate closed
 */
router.post('/:id/join', authMiddleware, joinDebate);

export default router;