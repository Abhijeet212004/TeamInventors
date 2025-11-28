import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { SendOTPInput, VerifyOTPInput, LoginInput } from './auth.validation';

export class AuthController {
  /**
   * Send OTP to phone/email
   * @route POST /api/auth/send-otp
   */
  async sendOTP(
    req: Request<{}, {}, SendOTPInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Log incoming request body for debugging
      console.log('🔍 [send-otp] Request body:', JSON.stringify(req.body, null, 2));
      const result = await authService.sendOTP(req.body);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify OTP and create/login user
   * @route POST /api/auth/verify-otp
   */
  async verifyOTP(
    req: Request<{}, {}, VerifyOTPInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Log incoming request body for debugging
      console.log('🔍 [verify-otp] Request body:', JSON.stringify(req.body, null, 2));
      const result = await authService.verifyOTP(req.body);

      res.status(200).json({
        success: true,
        message: result.isNewUser
          ? 'Registration successful! Welcome to AlertMate.'
          : 'Login successful! Welcome back.',
        data: {
          user: result.user,
          token: result.token,
          qrCodeImage: result.qrCodeImage,
          isNewUser: result.isNewUser,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login existing user (send OTP)
   * @route POST /api/auth/login
   */
  async login(
    req: Request<{}, {}, LoginInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await authService.login(req.body);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   * @route GET /api/auth/me
   */
  async getCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Token is verified in middleware, user is attached to req
      const user = (req as any).user;

      // Generate QR code image for the user
      const qrCodeImage = await authService.generateQRCodeForUser(user.qrCode);

      res.status(200).json({
        success: true,
        data: {
          user: {
            ...user,
            qrCodeImage,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user's display name
   * @route POST /api/auth/update-name
   */
  async updateName(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { name } = req.body;

      // Validate name
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        res.status(400).json({
          success: false,
          message: 'Name must be at least 2 characters long',
        });
        return;
      }

      const updatedUser = await authService.updateUserName(userId, name.trim());

      res.status(200).json({
        success: true,
        message: 'Name updated successfully',
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user's push token
   * @route POST /api/auth/push-token
   */
  async updatePushToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { pushToken } = req.body;

      if (!pushToken || typeof pushToken !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Push token is required',
        });
        return;
      }

      await authService.updatePushToken(userId, pushToken);

      res.status(200).json({
        success: true,
        message: 'Push token updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
