import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EMAIL_TEMPLATES } from '../templates/email.templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const smtpKey = this.configService.get<string>('BREVO_SMTP_KEY');
    this.fromEmail =
      this.configService.get<string>('BREVO_FROM_EMAIL') ||
      'noreply@smartrestaurant.com';
    this.fromName =
      this.configService.get<string>('BREVO_FROM_NAME') || 'Qrenso';

    if (smtpKey) {
      // Brevo SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false, // Use TLS
        auth: {
          user: this.configService.get<string>('BREVO_SMTP_USER'),
          pass: smtpKey,
        },
      });
      this.logger.log('Brevo email service initialized');
    } else {
      this.logger.warn(
        'Brevo SMTP key not configured. Email sending will fail.',
      );
    }
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    fullName: string,
  ): Promise<void> {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL')}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: email,
      subject: EMAIL_TEMPLATES.verification.subject,
      html: EMAIL_TEMPLATES.verification.getHtml(fullName, verificationUrl),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}:`,
        error,
      );
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    fullName: string,
  ): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/auth/reset-password?token=${token}`;

    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: email,
      subject: EMAIL_TEMPLATES.passwordReset.subject,
      html: EMAIL_TEMPLATES.passwordReset.getHtml(fullName, resetUrl),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}:`,
        error,
      );
      throw new Error('Failed to send password reset email');
    }
  }

  async sendWelcomeEmail(email: string, fullName: string): Promise<void> {
    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: email,
      subject: EMAIL_TEMPLATES.welcome.subject,
      html: EMAIL_TEMPLATES.welcome.getHtml(fullName),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      // Don't throw error for welcome email as it's not critical
    }
  }
}
