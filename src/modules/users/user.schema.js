import { z } from 'zod';

export const getUserQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: z.enum(['createdAt', 'reputation', 'username']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })
});