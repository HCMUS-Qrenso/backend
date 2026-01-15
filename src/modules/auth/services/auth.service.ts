import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma.service';
import { HashUtil, t } from '../../../common/utils';
import { JwtPayload, AuthResponse } from '../../../common/interfaces';
import {
  LoginDto,
  SignupDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ResendEmailType,
  SetupPasswordDto,
  ChangePasswordDto,
} from '../dto';
import { EmailService } from './email.service';
import { TokenService } from './token.service';
import { ROLES, ACCOUNT_TYPES } from 'src/common/constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly tokenService: TokenService,
  ) {}

  async signup(signupDto: SignupDto): Promise<{ message: string }> {
    const { email, password, fullName, phone } = signupDto;

    // Check if customer account already exists for this email
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email_accountType: {
          email,
          accountType: ACCOUNT_TYPES.CUSTOMER,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException(
        t('auth.userExists', 'User with this email already exists'),
      );
    }

    const passwordHash = await HashUtil.hash(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
        role: ROLES.CUSTOMER, // Default role set to 'customer', no signup for other roles
        accountType: ACCOUNT_TYPES.CUSTOMER, // Signup is only for customer accounts
        emailVerified: false,
        status: 'active',
      },
    });

    const verificationToken = await this.tokenService.createVerificationToken(
      user.id,
      'email_verification',
    );

    await this.emailService.sendVerificationEmail(
      email,
      verificationToken,
      fullName,
      ROLES.CUSTOMER, // Customer signup always uses customer frontend
    );

    this.logger.log(`User registered: ${email}`);

    return {
      message: t('auth.userRegistered', 'User registered successfully'),
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password, accountType = ACCOUNT_TYPES.CUSTOMER } = loginDto;

    // Find user with specific email and account type
    const user = await this.prisma.user.findUnique({
      where: {
        email_accountType: {
          email,
          accountType,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        t('auth.emailNotExists', 'Email address not found'),
      );
    }

    if (user.emailVerified === false) {
      throw new UnauthorizedException(
        t('auth.emailNotVerified', 'Email address not verified'),
      );
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        t('auth.invalidCredentials', 'Invalid credentials'),
      );
    }

    const isPasswordValid = await HashUtil.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        t('auth.wrongPassword', 'Incorrect password'),
      );
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException(
        t('auth.accountInactive', 'Account is inactive'),
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`User logged in: ${email}`);

    return this.generateAuthResponse(user);
  }

  async refreshToken({
    refreshToken,
  }: {
    refreshToken: string;
  }): Promise<AuthResponse> {
    const user = await this.tokenService.validateRefreshToken(refreshToken);

    if (!user) {
      throw new UnauthorizedException(
        t('auth.invalidRefreshToken', 'Invalid or expired refresh token'),
      );
    }

    await this.tokenService.deleteRefreshToken(refreshToken);

    this.logger.log(`Token refreshed for user: ${user.email}`);

    return this.generateAuthResponse(user);
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email, accountType = ACCOUNT_TYPES.CUSTOMER } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: {
        email_accountType: {
          email,
          accountType,
        },
      },
    });

    if (!user) {
      return {
        message: t(
          'auth.passwordResetSent',
          'If the email exists, a password reset link has been sent.',
        ),
      };
    }

    const resetToken = await this.tokenService.createVerificationToken(
      user.id,
      'password_reset',
    );

    await this.emailService.sendPasswordResetEmail(
      email,
      resetToken,
      user.fullName,
      user.role, // Use user's role to determine frontend URL
    );

    this.logger.log(`Password reset requested for: ${email}`);

    return {
      message: t(
        'auth.passwordResetSent',
        'If the email exists, a password reset link has been sent.',
      ),
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const {
      token,
      newPassword,
      accountType = ACCOUNT_TYPES.CUSTOMER,
    } = resetPasswordDto;

    const validation = await this.tokenService.validateVerificationToken(
      token,
      'password_reset',
    );

    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // Verify the token belongs to a user with the specified account type
    if (validation.user!.accountType !== accountType) {
      throw new BadRequestException(
        t('auth.invalidAccountType', 'Invalid account type for this token'),
      );
    }

    const passwordHash = await HashUtil.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: validation.user!.id },
        data: { passwordHash },
      }),
      this.prisma.userVerificationToken.update({
        where: { id: validation.tokenId },
        data: { usedAt: new Date() },
      }),
    ]);

    this.logger.log(`Password reset for user: ${validation.user!.email}`);

    return {
      message: t('auth.passwordResetSuccess', 'Password reset successfully'),
    };
  }

  /**
   * Setup password for invited staff (first-time login)
   * Uses email_verification token type
   */
  async setupPassword(
    setupPasswordDto: SetupPasswordDto,
  ): Promise<{ message: string }> {
    const { email, token, password } = setupPasswordDto;

    const validation = await this.tokenService.validateVerificationToken(
      token,
      'email_verification',
    );

    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    if (validation.user!.email !== email) {
      throw new BadRequestException(
        t('auth.invalidEmail', 'Invalid email address'),
      );
    }

    // Check if user already has a password (already set up)
    if (validation.user!.passwordHash) {
      throw new BadRequestException(
        t('auth.accountAlreadySetup', 'Account has already been set up'),
      );
    }

    const passwordHash = await HashUtil.hash(password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: validation.user!.id },
        data: {
          passwordHash,
          emailVerified: true,
        },
      }),
      this.prisma.userVerificationToken.update({
        where: { id: validation.tokenId },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.emailService.sendWelcomeEmail(email, validation.user!.fullName);

    this.logger.log(`Account setup completed for: ${email}`);

    return {
      message: t('auth.accountSetupSuccess', 'Account set up successfully'),
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException(t('auth.userNotFound', 'User not found'));
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        t('auth.noPasswordSet', 'No password set for this account'),
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await HashUtil.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException(
        t('auth.incorrectCurrentPassword', 'Current password is incorrect'),
      );
    }

    // Hash new password
    const newPasswordHash = await HashUtil.hash(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    this.logger.log(`Password changed for user: ${user.email}`);

    return {
      message: t('auth.passwordChanged', 'Password changed successfully'),
    };
  }

  async verifyEmail(
    email: string,
    token: string,
  ): Promise<{ message: string }> {
    const validation = await this.tokenService.validateVerificationToken(
      token,
      'email_verification',
    );

    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    if (validation.user!.email !== email) {
      throw new BadRequestException(
        t('auth.invalidEmail', 'Invalid email address'),
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: validation.user!.id },
        data: { emailVerified: true },
      }),
      this.prisma.userVerificationToken.update({
        where: { id: validation.tokenId },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.emailService.sendWelcomeEmail(email, validation.user!.fullName);

    this.logger.log(`Email verified for user: ${email}`);

    return {
      message: t('auth.emailVerifiedSuccess', 'Email verified successfully'),
    };
  }

  async resendEmail(
    email: string,
    type: ResendEmailType,
    accountType: string = ACCOUNT_TYPES.CUSTOMER,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: {
        email_accountType: {
          email,
          accountType,
        },
      },
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return {
        message: t(
          type === ResendEmailType.PASSWORD_RESET
            ? 'auth.passwordResetSent'
            : 'auth.verificationEmailSent',
          type === ResendEmailType.PASSWORD_RESET
            ? 'If the email exists, a password reset link has been sent.'
            : 'If the email exists and is not verified, a verification link has been sent.',
        ),
      };
    }

    // For email verification, check if already verified
    if (type === ResendEmailType.EMAIL_VERIFICATION && user.emailVerified) {
      throw new BadRequestException(
        t('auth.emailAlreadyVerified', 'Email is already verified'),
      );
    }

    // Invalidate old tokens for this user
    await this.prisma.userVerificationToken.updateMany({
      where: {
        userId: user.id,
        type: type,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Create new token
    const verificationToken = await this.tokenService.createVerificationToken(
      user.id,
      type,
    );

    // Send appropriate email based on type
    if (type === ResendEmailType.PASSWORD_RESET) {
      await this.emailService.sendPasswordResetEmail(
        email,
        verificationToken,
        user.fullName,
        user.role, // Use user's role to determine frontend URL
      );
      this.logger.log(`Password reset email resent for: ${email}`);
    } else {
      await this.emailService.sendVerificationEmail(
        email,
        verificationToken,
        user.fullName,
        user.role, // Use user's role to determine frontend URL
      );
      this.logger.log(`Verification email resent for: ${email}`);
    }

    return {
      message: t(
        type === ResendEmailType.PASSWORD_RESET
          ? 'auth.passwordResetSent'
          : 'auth.verificationEmailSent',
        type === ResendEmailType.PASSWORD_RESET
          ? 'If the email exists, a password reset link has been sent.'
          : 'Verification email sent successfully. Please check your inbox.',
      ),
    };
  }

  async googleLogin(googleUser: any): Promise<AuthResponse> {
    const { googleId, email, fullName, avatarUrl, accessToken, refreshToken } =
      googleUser;

    const oauthProvider = await this.prisma.userOAuthProvider.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'google',
          providerUserId: googleId,
        },
      },
      include: { user: true },
    });

    let user;

    if (oauthProvider) {
      user = oauthProvider.user;

      await this.prisma.userOAuthProvider.update({
        where: { id: oauthProvider.id },
        data: { accessToken, refreshToken },
      });
    } else {
      user = await this.prisma.user.findUnique({
        where: {
          email_accountType: {
            email,
            accountType: ACCOUNT_TYPES.CUSTOMER,
          },
        },
      });

      if (user) {
        await this.prisma.userOAuthProvider.create({
          data: {
            userId: user.id,
            provider: 'google',
            providerUserId: googleId,
            accessToken,
            refreshToken,
          },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email,
            fullName,
            avatarUrl,
            role: ROLES.CUSTOMER,
            accountType: ACCOUNT_TYPES.CUSTOMER, // OAuth signup is for customers only
            emailVerified: true,
            status: 'active',
            oauthProviders: {
              create: {
                provider: 'google',
                providerUserId: googleId,
                accessToken,
                refreshToken,
              },
            },
          },
        });
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`Google OAuth login: ${email}`);

    return this.generateAuthResponse(user);
  }

  async logout(
    userId: string,
    refreshToken: string,
  ): Promise<{ message: string }> {
    try {
      await this.tokenService.deleteRefreshToken(refreshToken);
      this.logger.log(`User logged out: ${userId}`);
    } catch (error) {
      this.logger.warn(
        `Logout attempted with invalid token for user: ${userId}`,
      );
    }

    return {
      message: t('auth.logoutSuccess', 'Logged out successfully'),
    };
  }

  async createRefreshToken(userId: string): Promise<string> {
    return this.tokenService.createRefreshToken(userId);
  }

  private generateAuthResponse(user: any): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}
