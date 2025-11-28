import type { Transporter } from 'nodemailer';

export class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    // EMAIL DISABLED - No email service for now
    console.log('⚠️  Email service completely disabled');
    this.transporter = null;
  }

  /**
   * Send OTP via email
   */
  async sendOTPEmail(to: string, otp: string, expiresInMinutes: number): Promise<void> {
    // Skip email if not configured
    if (!this.transporter) {
      console.log('⚠️  Email not configured, skipping OTP email to:', to);
      return;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject: '🔐 Your AlertMate OTP Code',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 10px;
              padding: 30px;
              color: white;
            }
            .otp-box {
              background: white;
              color: #333;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              margin: 20px 0;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #667eea;
              margin: 10px 0;
            }
            .info {
              background: rgba(255, 255, 255, 0.1);
              padding: 15px;
              border-radius: 8px;
              margin-top: 20px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: rgba(255, 255, 255, 0.8);
            }
            .warning {
              color: #ffd700;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🏥 AlertMate Verification</h1>
            <p>Hello,</p>
            <p>You requested an OTP to access your AlertMate account. Use the code below to complete your verification:</p>
            
            <div class="otp-box">
              <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Your OTP Code</div>
              <div class="otp-code">${otp}</div>
              <div style="font-size: 12px; color: #999; margin-top: 10px;">Valid for ${expiresInMinutes} minutes</div>
            </div>

            <div class="info">
              <p><strong>⏰ Expires in:</strong> ${expiresInMinutes} minutes</p>
              <p><strong>🔒 Security Note:</strong> Never share this OTP with anyone. AlertMate team will never ask for your OTP.</p>
            </div>

            <p class="warning">⚠️ If you didn't request this code, please ignore this email or contact our support team.</p>

            <div class="footer">
              <p>© ${new Date().getFullYear()} AlertMate - AI-Powered Personal Safety Companion</p>
              <p>Your safety is our priority 💙</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        AlertMate Verification Code
        
        Your OTP code is: ${otp}
        
        This code will expire in ${expiresInMinutes} minutes.
        
        If you didn't request this code, please ignore this email.
        
        © ${new Date().getFullYear()} AlertMate
      `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent successfully to ${to}`);
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      // Don't throw error - allow OTP to be sent via SMS even if email fails
      console.log('⚠️  Continuing without email (OTP will be sent via SMS)');
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(to: string, userName?: string): Promise<void> {
    if (!this.transporter) {
      console.log('⚠️  Email not configured, skipping welcome email');
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: '🎉 Welcome to AlertMate - Your Safety Companion',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 10px;
              padding: 30px;
              color: white;
            }
            .content {
              background: white;
              color: #333;
              padding: 30px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .feature {
              margin: 15px 0;
              padding-left: 30px;
            }
            h2 {
              color: #667eea;
            }
            .cta {
              background: #667eea;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              display: inline-block;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: rgba(255, 255, 255, 0.8);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎉 Welcome to AlertMate!</h1>
            
            <div class="content">
              <h2>Hi${userName ? ' ' + userName : ''}! 👋</h2>
              <p>Thank you for joining AlertMate - Your AI-powered personal safety companion!</p>
              
              <h3>🛡️ What's Next?</h3>
              <div class="feature">
                <strong>1. Connect Guardians 👨‍👩‍👧‍👦</strong><br>
                Share your QR code with trusted contacts so they can monitor your safety.
              </div>
              <div class="feature">
                <strong>2. Set Up Safety Features 🚨</strong><br>
                Configure emergency contacts, safe zones, and automated alerts.
              </div>
              <div class="feature">
                <strong>3. Enable Location Tracking 📍</strong><br>
                Allow location access for real-time safety monitoring.
              </div>

              <h3>🌟 Key Features</h3>
              <ul>
                <li>🤖 AI-powered distress detection</li>
                <li>📱 Automatic emergency alerts</li>
                <li>👥 Guardian monitoring system</li>
                <li>📍 Real-time location tracking</li>
                <li>🔊 Voice-activated SOS</li>
              </ul>

              <p><strong>Your safety is our priority.</strong> If you have any questions, our support team is here to help.</p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} AlertMate - AI-Powered Personal Safety Companion</p>
              <p>Stay safe, stay connected 💙</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${to}`);
    } catch (error) {
      console.error('❌ Welcome email failed:', error);
      // Don't throw error for welcome email - it's not critical
    }
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.log('⚠️  Email service not configured - skipping test');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready');
      return true;
    } catch (error) {
      console.error('❌ Email service configuration error:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
