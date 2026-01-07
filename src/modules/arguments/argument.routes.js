import { Router } from 'express';
import {
  createArgument,
  getArgument,
  updateArgument,
  deleteArgument,
  voteOnArgument,
  createConnection,
  rateArgument,
  getArgumentRatings,
  getArgumentAnalysis
} from './argument.controller.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validation.middleware.js';
import {
  createArgumentSchema,
  updateArgumentSchema,
  voteArgumentSchema,
  createConnectionSchema,
  createRatingSchema
} from './argument.schema.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Argument:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         content:
 *           type: string
 *         type:
 *           type: string
 *           enum: [support, oppose, clarification, question]
 *         author:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             username:
 *               type: string
 *             avatar_url:
 *               type: string
 *         debate:
 *           type: string
 *         parentArgument:
 *           type: string
 *         level:
 *           type: number
 *         votes:
 *           type: object
 *           properties:
 *             upvotes:
 *               type: number
 *             downvotes:
 *               type: number
 *         rating:
 *           type: object
 *           properties:
 *             average:
 *               type: number
 *             count:
 *               type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 */

// Argument CRUD operations
router.get('/:id', getArgument);
router.put('/:id', authMiddleware, validate(updateArgumentSchema), updateArgument);
router.delete('/:id', authMiddleware, deleteArgument);

// Voting on arguments
router.post('/:id/vote', authMiddleware, validate(voteArgumentSchema), voteOnArgument);

// Connections between arguments
router.post('/:id/connections', authMiddleware, validate(createConnectionSchema), createConnection);

// Rating arguments
router.post('/:id/ratings', authMiddleware, validate(createRatingSchema), rateArgument);
router.get('/:id/ratings', getArgumentRatings);

// AI analysis
router.get('/:id/analysis', authMiddleware, getArgumentAnalysis);

export default router;