import { Router } from 'express';
import {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  uploadAvatar,
  removeAvatar,
  logout,
  deleteAccount,
  refreshToken,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  checkUsernameAvailability
} from './auth.controller.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validation.middleware.js';
import { authRateLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { uploadAvatar as uploadAvatarMiddleware, uploadAvatarOptional, handleUploadError } from '../../middlewares/upload.middleware.js';
import { 
  registerSchema, 
  loginSchema, 
  updateProfileSchema, 
  changePasswordSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  verifyResetOTPSchema,
  resetPasswordSchema
} from './auth.schema.js';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', authRateLimiter, validate(registerSchema), register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', authRateLimiter, validate(loginSchema), login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Refresh token is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh', authRateLimiter, validate(refreshTokenSchema), refreshToken);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the account
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: OTP sent successfully (or security message if email not found)
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
 *                   example: "Password reset OTP has been sent to your email address."
 *                 data:
 *                   type: object
 *                   properties:
 *                     sent:
 *                       type: boolean
 *                       description: Whether OTP was actually sent
 *                     expiresIn:
 *                       type: number
 *                       description: OTP expiration time in minutes
 *                       example: 10
 *       400:
 *         description: Invalid email format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       503:
 *         description: Email service not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), forgotPassword);

/**
 * @swagger
 * /auth/verify-reset-otp:
 *   post:
 *     summary: Verify password reset OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address
 *                 example: "user@example.com"
 *               otp:
 *                 type: string
 *                 pattern: '^[0-9]{4,8}$'
 *                 description: 4-8 digit OTP code
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
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
 *                   example: "OTP verified successfully. You can now reset your password."
 *                 data:
 *                   type: object
 *                   properties:
 *                     resetToken:
 *                       type: string
 *                       description: Temporary token for password reset (valid 15 minutes)
 *                     email:
 *                       type: string
 *                       description: Verified email address
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/verify-reset-otp', authRateLimiter, validate(verifyResetOTPSchema), verifyResetOTP);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using reset token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resetToken, newPassword]
 *             properties:
 *               resetToken:
 *                 type: string
 *                 description: Reset token from OTP verification
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)'
 *                 description: New password (min 8 chars, must contain uppercase, lowercase, and number)
 *                 example: "NewPassword123"
 *     responses:
 *       200:
 *         description: Password reset successfully
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
 *                   example: "Password has been reset successfully. You can now log in with your new password."
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       description: Email of the account that was reset
 *       400:
 *         description: Invalid reset token or password format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid or expired reset token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), resetPassword);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', authMiddleware, me);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 description: 'New username (optional)'
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: 'Avatar image file (optional, JPEG, PNG, WebP, max 5MB)'
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Validation error or invalid file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Username already taken
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/profile', authMiddleware, uploadAvatarOptional, handleUploadError, validate(updateProfileSchema), updateProfile);

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized or invalid current password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/change-password', authMiddleware, validate(changePasswordSchema), changePassword);

/**
 * @swagger
 * /auth/avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (JPEG, PNG, WebP, max 5MB)
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
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
 *                   example: Avatar uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     avatar_url:
 *                       type: string
 *                       example: https://res.cloudinary.com/demo/image/upload/v1234567890/argument-graph/avatars/user123.jpg
 *       400:
 *         description: Bad request - no file or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/avatar', authMiddleware, uploadAvatarMiddleware, handleUploadError, uploadAvatar);

/**
 * @swagger
 * /auth/avatar:
 *   delete:
 *     summary: Remove user avatar
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Avatar removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: No avatar to remove
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/avatar', authMiddleware, removeAvatar);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/logout', authMiddleware, logout);

/**
 * @swagger
 * /auth/delete-account:
 *   delete:
 *     summary: Delete user account permanently
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password, confirmation]
 *             properties:
 *               password:
 *                 type: string
 *                 description: Current password for verification
 *               confirmation:
 *                 type: string
 *                 enum: ["DELETE_MY_ACCOUNT"]
 *                 description: Must be exactly "DELETE_MY_ACCOUNT" to confirm deletion
 *     responses:
 *       200:
 *         description: Account deleted successfully
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
 *                   example: Account deleted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedAt:
 *                       type: string
 *                       format: date-time
 *                     deletedData:
 *                       type: object
 *                       properties:
 *                         user: 
 *                           type: boolean
 *                         debates:
 *                           type: number
 *                         arguments:
 *                           type: number
 *                         ratings:
 *                           type: number
 *                         connections:
 *                           type: number
 *       400:
 *         description: Invalid password or confirmation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized or invalid password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/delete-account', authMiddleware, deleteAccount);

/**
 * @swagger
 * /auth/check-username/{username}:
 *   get:
 *     summary: Check if username is available
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 3
 *           maxLength: 30
 *           pattern: '^[a-zA-Z0-9_]+$'
 *         description: Username to check (case-insensitive)
 *         example: "JohnDoe123"
 *     responses:
 *       200:
 *         description: Username availability check result
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
 *                   example: "Username is available"
 *                 data:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                       description: Normalized username (lowercase)
 *                       example: "johndoe123"
 *                     available:
 *                       type: boolean
 *                       description: Whether the username is available
 *                       example: true
 *                     message:
 *                       type: string
 *                       description: Human-readable availability message
 *                       example: "Username is available"
 *       400:
 *         description: Invalid username format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/check-username/:username', checkUsernameAvailability);

export default router;