import { z } from 'zod';

// Auth validation schemas
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must not exceed 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  })
});

export const updateProfileSchema = z.object({
  body: z.object({
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must not exceed 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
      .optional()
  })
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
  })
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format')
  })
});

export const verifyResetOTPSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    otp: z.string()
      .min(4, 'OTP must be at least 4 digits')
      .max(8, 'OTP must not exceed 8 digits')
      .regex(/^\d+$/, 'OTP must contain only numbers')
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    resetToken: z.string().min(1, 'Reset token is required'),
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
  })
});