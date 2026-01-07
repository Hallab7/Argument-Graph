import { z } from 'zod';

export const createArgumentSchema = z.object({
  body: z.object({
    content: z.string()
      .min(10, 'Argument must be at least 10 characters')
      .max(5000, 'Argument must not exceed 5000 characters')
      .trim(),
    type: z.enum(['support', 'oppose', 'clarification', 'question']),
    parentArgument: z.string().optional(),
    sources: z.array(z.object({
      title: z.string().optional(),
      url: z.string().url('Invalid URL format').optional(),
      description: z.string().optional()
    })).optional(),
    position: z.object({
      x: z.number().optional(),
      y: z.number().optional()
    }).optional()
  })
});

export const updateArgumentSchema = z.object({
  body: z.object({
    content: z.string()
      .min(10, 'Argument must be at least 10 characters')
      .max(5000, 'Argument must not exceed 5000 characters')
      .trim()
      .optional(),
    sources: z.array(z.object({
      title: z.string().optional(),
      url: z.string().url('Invalid URL format').optional(),
      description: z.string().optional()
    })).optional(),
    position: z.object({
      x: z.number().optional(),
      y: z.number().optional()
    }).optional(),
    reason: z.string()
      .max(200, 'Edit reason must not exceed 200 characters')
      .optional()
  })
});

export const voteArgumentSchema = z.object({
  body: z.object({
    vote: z.enum(['up', 'down', 'remove'])
  })
});

export const createConnectionSchema = z.object({
  body: z.object({
    targetArgumentId: z.string().min(1, 'Target argument ID is required'),
    connectionType: z.enum(['supports', 'opposes', 'clarifies', 'builds_on', 'questions', 'refutes']),
    strength: z.number()
      .min(1, 'Strength must be at least 1')
      .max(5, 'Strength must not exceed 5')
      .optional(),
    description: z.string()
      .max(500, 'Description must not exceed 500 characters')
      .trim()
      .optional()
  })
});

export const createRatingSchema = z.object({
  body: z.object({
    score: z.number()
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating must not exceed 5'),
    criteria: z.object({
      logic: z.number().min(1).max(5).optional(),
      evidence: z.number().min(1).max(5).optional(),
      relevance: z.number().min(1).max(5).optional(),
      clarity: z.number().min(1).max(5).optional()
    }).optional(),
    comment: z.string()
      .max(1000, 'Comment must not exceed 1000 characters')
      .trim()
      .optional(),
    isAnonymous: z.boolean().optional()
  })
});