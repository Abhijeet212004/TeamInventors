import { User } from '@prisma/client';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { nanoid } from 'nanoid';
import { authRepository } from './auth.repository';
import { SendOTPInput, VerifyOTPInput, LoginInput } from './auth.validation';
import { emailService } from '../../services/email.service';

// In-memory OTP storage (Replace with Redis in production)
interface OTPStore {
  [phone: string]: {
    otp: string;
    expiresAt: Date;
    attempts: number;
  };
}

const otpStore: OTPStore = {};

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5');
  private readonly MAX_OTP_ATTEMPTS = 3;

  /**
   * Generate a 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate unique QR code identifier
   */
  private generateQRCodeId(): string {
    return `ALM-${nanoid(10).toUpperCase()}`;
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string): string {
    return jwt.sign({ userId }, this.JWT_SECRET, {
      expiresIn: '7d',
    });
  }

  /**
   * Generate QR code image (base64)
   */
  private async generateQRCodeImage(qrCodeId: string): Promise<string> {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeId, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300,
      });
      return qrCodeDataUrl;
    } catch (error) {
      console.error('QR Code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code image for existing user (public method)
   */
  async generateQRCodeForUser(qrCodeId: string): Promise<string> {
    return await this.generateQRCodeImage(qrCodeId);
  }

  /**
   * Send OTP to phone
   */
  async sendOTP(data: SendOTPInput): Promise<{ message: string; expiresIn: number }> {
    const { phone, email } = data;

    // Generate OTP
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP in memory (Replace with Redis in production)
    otpStore[phone] = {
      otp,
      expiresAt,
      attempts: 0,
    };

    // Log OTP to console (for development)
    console.log(`📱 OTP for ${phone}: ${otp} (Expires at ${expiresAt.toISOString()})`);

    // Send OTP via email if provided
    if (email) {
      try {
        await emailService.sendOTPEmail(email, otp, this.OTP_EXPIRY_MINUTES);
        console.log(`📧 OTP email sent to: ${email}`);
      } catch (error) {
        console.error('Email sending failed, but OTP is still valid:', error);
        // Don't throw error - OTP is still valid even if email fails
      }
    }

    // TODO: Integrate with SMS service (Twilio, MSG91, etc.) for phone
    // await smsService.sendOTP(phone, otp);

    return {
      message: email
        ? 'OTP sent to your email and phone'
        : 'OTP sent successfully',
      expiresIn: this.OTP_EXPIRY_MINUTES * 60, // in seconds
    };
  }

  /**
   * Verify OTP and create/login user
   */
  async verifyOTP(data: VerifyOTPInput): Promise<{
    user: Omit<User, 'createdAt' | 'updatedAt'>;
    token: string;
    qrCodeImage: string;
    isNewUser: boolean;
  }> {
    const { phone, otp, email } = data;

    // Check if OTP exists
    const storedOTP = otpStore[phone];
    if (!storedOTP) {
      throw new Error('OTP not found. Please request a new OTP.');
    }

    // Check if OTP expired
    if (new Date() > storedOTP.expiresAt) {
      delete otpStore[phone];
      throw new Error('OTP has expired. Please request a new OTP.');
    }

    // Check max attempts
    if (storedOTP.attempts >= this.MAX_OTP_ATTEMPTS) {
      delete otpStore[phone];
      throw new Error('Maximum OTP attempts exceeded. Please request a new OTP.');
    }

    // Verify OTP
    if (storedOTP.otp !== otp) {
      storedOTP.attempts++;
      throw new Error(`Invalid OTP. ${this.MAX_OTP_ATTEMPTS - storedOTP.attempts} attempts remaining.`);
    }

    // OTP verified, remove from store
    delete otpStore[phone];

    // Check if user exists
    let user = await authRepository.findUserByPhone(phone);
    let isNewUser = false;

    if (!user) {
      // Create new user
      const qrCodeId = this.generateQRCodeId();
      user = await authRepository.createUser({
        phone,
        email: email || undefined,
        qrCode: qrCodeId,
        role: 'USER',
      });
      isNewUser = true;

      // Send welcome email to new users
      if (email) {
        try {
          await emailService.sendWelcomeEmail(email);
        } catch (error) {
          console.error('Welcome email failed:', error);
          // Don't throw error - user creation is successful
        }
      }
    } else {
      // User exists - check if we need to update email
      if (email && email !== user.email) {
        // Check if this email is already used by another user
        const emailExists = await authRepository.findUserByEmail(email);
        if (!emailExists || emailExists.id === user.id) {
          // Safe to update - either email is not used or it belongs to this user
          user = await authRepository.updateUser(user.id, { email });
        }
        // If email is used by another user, just skip the update
      }
    }

    // Generate JWT token
    const token = this.generateToken(user.id);

    // Generate QR code image
    const qrCodeImage = await this.generateQRCodeImage(user.qrCode);

    return {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        qrCode: user.qrCode,
        isActive: user.isActive,
      },
      token,
      qrCodeImage,
      isNewUser,
    };
  }

  /**
   * Login existing user (send OTP)
   */
  async login(data: LoginInput): Promise<{ message: string; expiresIn: number }> {
    const { phone } = data;

    // Check if user exists
    const user = await authRepository.findUserByPhone(phone);
    if (!user) {
      throw new Error('User not found. Please register first.');
    }

    if (!user.isActive) {
      throw new Error('User account is deactivated. Please contact support.');
    }

    // Send OTP (use user's email if available, or empty string)
    return await this.sendOTP({ phone, email: user.email || '' });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get user by token
   */
  async getUserByToken(token: string): Promise<User | null> {
    const { userId } = this.verifyToken(token);
    return await authRepository.findUserById(userId);
  }

  /**
   * Update user's display name
   */
  async updateUserName(userId: string, name: string) {
    return authRepository.updateUserName(userId, name);
  }

  async updatePushToken(userId: string, pushToken: string) {
    return authRepository.updateUser(userId, { pushToken });
  }
}

export const authService = new AuthService();

// Development helper: expose stored OTP for debugging only
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const svc: any = authService as any;
  svc.getStoredOTP = (phone: string) => otpStore[phone] || null;
}
