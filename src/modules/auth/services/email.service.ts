import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EMAIL_TEMPLATES } from '../templates/email.templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly apiKey?: string;
  private readonly apiUrl = 'https://api.brevo.com/v3/smtp/email';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY');
    this.fromEmail =
      this.configService.get<string>('BREVO_FROM_EMAIL') ||
      'noreply@smartrestaurant.com';
    this.fromName =
      this.configService.get<string>('BREVO_FROM_NAME') || 'Qrenso';

    if (!this.apiKey) {
      this.logger.warn(
        'Brevo API key not configured. Email sending will fail.',
      );
    } else {
      this.logger.log('Brevo email service initialized with API');
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Brevo API key not configured');
    }

    const payload = {
      sender: {
        name: this.fromName,
        email: this.fromEmail,
      },
      to: [{ email: to }],
      subject,
      htmlContent,
    };

    try {
      await firstValueFrom(
        this.httpService.post(this.apiUrl, payload, {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }),
      );
    } catch (error) {
      this.logger.error('Failed to send email via Brevo API:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    fullName: string,
  ): Promise<void> {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL')}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    try {
      await this.sendEmail(
        email,
        EMAIL_TEMPLATES.verification.subject,
        EMAIL_TEMPLATES.verification.getHtml(fullName, verificationUrl),
      );
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

    try {
      await this.sendEmail(
        email,
        EMAIL_TEMPLATES.passwordReset.subject,
        EMAIL_TEMPLATES.passwordReset.getHtml(fullName, resetUrl),
      );
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
    try {
      await this.sendEmail(
        email,
        EMAIL_TEMPLATES.welcome.subject,
        EMAIL_TEMPLATES.welcome.getHtml(fullName),
      );
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      // Don't throw error for welcome email as it's not critical
    }
  }

  async sendStaffInviteEmail(
    email: string,
    token: string,
    fullName: string,
    restaurantName?: string,
  ): Promise<void> {
    const setupUrl = `${this.configService.get<string>('FRONTEND_URL')}/auth/setup-password?token=${token}&email=${encodeURIComponent(email)}`;

    try {
      await this.sendEmail(
        email,
        EMAIL_TEMPLATES.staffInvite.subject,
        EMAIL_TEMPLATES.staffInvite.getHtml(fullName, setupUrl, restaurantName),
      );
      this.logger.log(`Staff invite email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send staff invite email to ${email}:`,
        error,
      );
      throw new Error('Failed to send staff invite email');
    }
  }
}
