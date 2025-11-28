import { z } from 'zod';

// Phone validation for Indian numbers
const phoneRegex = /^[6-9]\d{9}$/;

/**
 * @swagger
 * components:
 *   schemas:
 *     SendOTPRequest:
 *       type: object
 *       required:
 *         - phone
 *       properties:
 *         phone:
 *           type: string
 *           pattern: '^[6-9]\d{9}$'
 *           description: 10-digit Indian phone number
 *           example: "9876543210"
 *         email:
 *           type: string
 *           format: email
 *           description: Email address (required)
 *           example: "user@example.com"
 */
export const sendOTPSchema = z.object({
  body: z.object({
    phone: z
      .string()
      .regex(phoneRegex, 'Invalid Indian phone number. Must be 10 digits starting with 6-9')
      .length(10, 'Phone number must be exactly 10 digits'),
    email: z
      .string()
      .email('Invalid email format')
      .min(1, 'Email is required'),
  }),
});

/**
 * @swagger
 * components:
 *   schemas:
 *     VerifyOTPRequest:
 *       type: object
 *       required:
 *         - phone
 *         - otp
 *       properties:
 *         phone:
 *           type: string
 *           pattern: '^[6-9]\d{9}$'
 *           description: 10-digit Indian phone number
 *           example: "9876543210"
 *         otp:
 *           type: string
 *           minLength: 6
 *           maxLength: 6
 *           description: 6-digit OTP
 *           example: "123456"
 *         email:
 *           type: string
 *           format: email
 *           description: Email address (required)
 *           example: "user@example.com"
 */
export const verifyOTPSchema = z.object({
  body: z.object({
    phone: z
      .string()
      .regex(phoneRegex, 'Invalid Indian phone number')
      .length(10),
    otp: z
      .string()
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d{6}$/, 'OTP must contain only numbers'),
    email: z
      .string()
      .email('Invalid email format')
      .min(1, 'Email is required'),
  }),
});

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - phone
 *       properties:
 *         phone:
 *           type: string
 *           pattern: '^[6-9]\d{9}$'
 *           description: 10-digit Indian phone number
 *           example: "9876543210"
 */
export const loginSchema = z.object({
  body: z.object({
    phone: z
      .string()
      .regex(phoneRegex, 'Invalid Indian phone number')
      .length(10),
  }),
});

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "OTP sent successfully"
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             token:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             qrCode:
 *               type: string
 *               description: Base64 encoded QR code image
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         phone:
 *           type: string
 *           example: "9876543210"
 *         email:
 *           type: string
 *           example: "user@example.com"
 *         role:
 *           type: string
 *           enum: [USER, GUARDIAN]
 *           example: "USER"
 *         qrCode:
 *           type: string
 *           example: "ALM-ABC123XYZ"
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "Invalid OTP"
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *               message:
 *                 type: string
 */

export type SendOTPInput = z.infer<typeof sendOTPSchema>['body'];
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
