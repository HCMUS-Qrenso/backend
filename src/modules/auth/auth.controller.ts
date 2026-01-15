import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { AuthService } from './services';
import {
  LoginDto,
  SignupDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendEmailDto,
  SetupPasswordDto,
  ChangePasswordDto,
  AuthResponseDto,
  MessageResponseDto,
  RefreshTokenDto,
} from './dto';
import { GoogleAuthGuard, JwtAuthGuard } from './guards';
import { Public, CurrentUser } from '../../common/decorators';
import { t } from '../../common/utils';
import { COOKIE_CONFIG, ROLES } from '../../common/constants';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  private getCookieConfig(accountType: string) {
    return accountType === 'staff'
      ? COOKIE_CONFIG.REFRESH_TOKEN.STAFF
      : COOKIE_CONFIG.REFRESH_TOKEN.CUSTOMER;
  }

  private setRefreshTokenCookie(
    res: Response,
    token: string,
    accountType: string,
    rememberMe: boolean = true,
  ): void {
    const config = this.getCookieConfig(accountType);
    const cookieOptions = {
      ...config.options,
      // If rememberMe=true: persistent cookie (7 days)
      // If rememberMe=false: session cookie (expires when browser closes)
      ...(rememberMe ? {} : { maxAge: undefined, expires: undefined }),
    };

    res.cookie(config.name, token, cookieOptions);
  }

  private clearRefreshTokenCookie(res: Response, accountType: string): void {
    const config = this.getCookieConfig(accountType);
    res.clearCookie(config.name, {
      path: config.options.path,
    });
  }

  private getRefreshTokenFromCookies(
    req: Request,
    accountType: string,
  ): string | undefined {
    const config = this.getCookieConfig(accountType);
    return req.cookies[config.name];
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new customer account',
    description:
      'Create a new customer account and send verification email. Supports localization via Accept-Language header for response messages.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Customer registered successfully. Verification email sent.',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Customer with this email already exists',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Authenticate user with email, password and account type. Account type determines whether to login as customer or staff. Returns specific error messages for different failure scenarios. Supports localization via Accept-Language header.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Login successful. Returns access token and sets refresh token cookie.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'Authentication failed. Possible errors:\n' +
      '- Invalid credentials for this account type\n' +
      '- Email address not verified\n' +
      '- Account is inactive',
    type: ErrorResponseDto,
    schema: {
      oneOf: [
        {
          properties: {
            statusCode: { type: 'number', example: 401 },
            message: { type: 'string', example: 'Email address not found' },
            error: { type: 'string', example: 'Unauthorized' },
          },
        },
        {
          properties: {
            statusCode: { type: 'number', example: 401 },
            message: { type: 'string', example: 'Email address not verified' },
            error: { type: 'string', example: 'Unauthorized' },
          },
        },
        {
          properties: {
            statusCode: { type: 'number', example: 401 },
            message: { type: 'string', example: 'Account is inactive' },
            error: { type: 'string', example: 'Unauthorized' },
          },
        },
      ],
    },
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.login(loginDto);
    const refreshToken = await this.authService.createRefreshToken(
      authResponse.user.id,
    );

    // Use rememberMe from loginDto (defaults to true)
    const rememberMe = loginDto.rememberMe ?? true;
    const accountType = loginDto.accountType ?? 'customer';
    this.setRefreshTokenCookie(res, refreshToken, accountType, rememberMe);
    this.logger.log(
      `User logged in: ${loginDto.email} (accountType: ${accountType}, rememberMe: ${rememberMe})`,
    );

    return authResponse;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token using refresh token from cookie',
    description:
      'Refresh access token using the refresh token stored in httpOnly cookie. The account_type should match the account type used during login to retrieve the correct cookie.',
  })
  @ApiCookieAuth('refreshToken')
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Token refreshed successfully. Returns new access token and sets new refresh token cookie.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired refresh token',
    type: ErrorResponseDto,
  })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accountType = refreshTokenDto.accountType ?? 'customer';
    const refreshToken = this.getRefreshTokenFromCookies(req, accountType);

    if (!refreshToken) {
      this.clearRefreshTokenCookie(res, accountType);
      throw new UnauthorizedException(
        t('auth.refreshTokenNotFound', 'Refresh token not found'),
      );
    }

    try {
      const authResponse = await this.authService.refreshToken({
        refreshToken,
      });
      const newRefreshToken = await this.authService.createRefreshToken(
        authResponse.user.id,
      );

      this.setRefreshTokenCookie(res, newRefreshToken, accountType);

      return authResponse;
    } catch (error) {
      this.clearRefreshTokenCookie(res, accountType);
      this.logger.warn('Failed refresh token attempt');
      throw error;
    }
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset email',
    description:
      'Send password reset email to specified email for the specified account type. Supports both customer and staff accounts.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'If the email exists, a password reset link has been sent.',
    type: MessageResponseDto,
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password using token from email',
    description:
      'Reset password using the token received in email. Account type must match the account type used when requesting the password reset.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired reset token',
    type: ErrorResponseDto,
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Public()
  @Post('setup-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set up password for invited staff (first-time login)',
    description:
      'Use this endpoint when an invited staff member needs to set their password for the first time. ' +
      'The token is received via email invitation link.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password set up successfully, account activated',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid token, email, or account already set up',
    type: ErrorResponseDto,
  })
  async setupPassword(@Body() setupPasswordDto: SetupPasswordDto) {
    return this.authService.setupPassword(setupPasswordDto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using token from email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email verified successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid verification token or email',
    type: ErrorResponseDto,
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(
      verifyEmailDto.email,
      verifyEmailDto.token,
    );
  }

  @Public()
  @Post('resend-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend email for email verification or password reset',
    description:
      'Request a new verification or password reset email for a specific account type. Supports both email_verification and password_reset types. ' +
      'Can be used if the original email was not received, expired, or accidentally deleted.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Email sent successfully (if email exists and meets requirements)',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Email is already verified (only for email_verification type)',
    type: ErrorResponseDto,
  })
  async resendEmail(@Body() resendDto: ResendEmailDto) {
    return this.authService.resendEmail(
      resendDto.email,
      resendDto.type,
      resendDto.accountType,
    );
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth 2.0 login' })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to Google OAuth consent screen',
  })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint()
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const authResponse = await this.authService.googleLogin(req.user);
    const refreshToken = await this.authService.createRefreshToken(
      authResponse.user.id,
    );

    // Google OAuth is for customers only
    this.setRefreshTokenCookie(res, refreshToken, 'customer');

    const customerFrontendUrl =
      process.env.CUSTOMER_FRONTEND_URL || 'http://localhost:3002';
    const redirectUrl = `${customerFrontendUrl}/auth/callback?accessToken=${authResponse.accessToken}`;

    res.redirect(redirectUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('refreshToken')
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logged out successfully. Refresh token cookie cleared.',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async logout(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Determine account type from user role
    const accountType = userRole === ROLES.CUSTOMER ? 'customer' : 'staff';
    const refreshToken = this.getRefreshTokenFromCookies(req, accountType);

    if (refreshToken) {
      await this.authService.logout(userId, refreshToken);
    }

    this.clearRefreshTokenCookie(res, accountType);
    this.logger.log(`User logged out: ${userId} (${accountType})`);

    return {
      message: t('auth.logoutSuccess', 'Logged out successfully'),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns current user information',
    schema: {
      properties: {
        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        email: { type: 'string', example: 'user@example.com' },
        fullName: { type: 'string', example: 'John Doe' },
        role: { type: 'string', example: 'customer' },
        tenantId: { type: 'string', nullable: true, example: null },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async getProfile(@CurrentUser() user: any) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change user password',
    description:
      "Change the current user's password. Requires current password verification for security.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid current password or validation error',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, changePasswordDto);
  }
}
