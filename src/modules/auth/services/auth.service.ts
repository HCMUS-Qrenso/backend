import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma.service';
import { HashUtil } from '../../../common/utils';
import { JwtPayload, AuthResponse } from '../../../common/interfaces';
import {
  LoginDto,
  SignupDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '../dto';
import { EmailService } from './email.service';
import { TokenService } from './token.service';

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
    const { email, password, fullName, phone, role } = signupDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await HashUtil.hash(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
        role: role || 'customer',
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
    );

    this.logger.log(`User registered: ${email}`);

    return {
      message:
        'User registered successfully. Please check your email to verify your account.',
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await HashUtil.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is inactive');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`User logged in: ${email}`);

    return this.generateAuthResponse(user);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    const { refreshToken } = refreshTokenDto;

    const user = await this.tokenService.validateRefreshToken(refreshToken);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.tokenService.deleteRefreshToken(refreshToken);

    this.logger.log(`Token refreshed for user: ${user.email}`);

    return this.generateAuthResponse(user);
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        message: 'If the email exists, a password reset link has been sent.',
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
    );

    this.logger.log(`Password reset requested for: ${email}`);

    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    const validation = await this.tokenService.validateVerificationToken(
      token,
      'password_reset',
    );

    if (!validation.valid) {
      throw new BadRequestException(validation.error);
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
      message: 'Password reset successfully',
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
      throw new BadRequestException('Invalid email address');
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
      message: 'Email verified successfully',
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
        where: { email },
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
            role: 'customer',
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
      message: 'Logged out successfully',
    };
  }

  async createRefreshToken(userId: string): Promise<string> {
    return this.tokenService.createRefreshToken(userId);
  }

  private async generateAuthResponse(user: any): Promise<AuthResponse> {
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
