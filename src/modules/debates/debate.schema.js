import { z } from 'zod';

export const createDebateSchema = z.object({
  body: z.object({
    title: z.string()
      .min(5, 'Title must be at least 5 characters')
      .max(200, 'Title must not exceed 200 characters')
      .trim(),
    description: z.string()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description must not exceed 2000 characters')
      .trim(),
    category: z.string()
      .max(50, 'Category must not exceed 50 characters')
      .trim()
      .optional(),
    tags: z.array(z.string().max(30, 'Tag must not exceed 30 characters').trim())
      .max(10, 'Maximum 10 tags allowed')
      .optional(),
    isPublic: z.boolean().optional()
  })
});

export const updateDebateSchema = z.object({
  body: z.object({
    title: z.string()
      .min(5, 'Title must be at least 5 characters')
      .max(200, 'Title must not exceed 200 characters')
      .trim()
      .optional(),
    description: z.string()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description must not exceed 2000 characters')
      .trim()
      .optional(),
    category: z.string()
      .max(50, 'Category must not exceed 50 characters')
      .trim()
      .optional(),
    tags: z.array(z.string().max(30, 'Tag must not exceed 30 characters').trim())
      .max(10, 'Maximum 10 tags allowed')
      .optional(),
    status: z.enum(['active', 'closed', 'archived']).optional(),
    isPublic: z.boolean().optional()
  })
});

export const debateQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum(['active', 'closed', 'archived']).optional(),
    category: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'argumentCount', 'viewCount']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })
});