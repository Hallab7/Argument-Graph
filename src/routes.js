import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import debateRoutes from './modules/debates/debate.routes.js';
import argumentRoutes from './modules/arguments/argument.routes.js';
import userRoutes from './modules/users/user.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import { createArgument } from './modules/arguments/argument.controller.js';
import authMiddleware from './middlewares/auth.middleware.js';
import { validate } from './middlewares/validation.middleware.js';
import { createArgumentSchema } from './modules/arguments/argument.schema.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/debates', debateRoutes);
router.use('/arguments', argumentRoutes);
router.use('/users', userRoutes);
router.use('/ai', aiRoutes);
router.use('/admin', adminRoutes);

// Route for creating arguments in debates
router.post('/debates/:debateId/arguments', 
  authMiddleware, 
  validate(createArgumentSchema), 
  createArgument
);

export default router;