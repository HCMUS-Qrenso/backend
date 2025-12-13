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
  AuthResponseDto,
  MessageResponseDto,
} from './dto';
import { GoogleAuthGuard, JwtAuthGuard } from './guards';
import { Public, CurrentUser } from '../../common/decorators';
import { COOKIE_CONFIG } from '../../common/constants';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  private setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie(
      COOKIE_CONFIG.REFRESH_TOKEN.name,
      token,
      COOKIE_CONFIG.REFRESH_TOKEN.options,
    );
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(COOKIE_CONFIG.REFRESH_TOKEN.name, {
      path: COOKIE_CONFIG.REFRESH_TOKEN.options.path,
    });
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully. Verification email sent.',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with this email already exists',
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
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Login successful. Returns access token and sets refresh token cookie.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials or account inactive',
    type: ErrorResponseDto,
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.login(loginDto);
    const refreshToken = await this.authService.createRefreshToken(
      authResponse.user.id,
    );

    this.setRefreshTokenCookie(res, refreshToken);
    this.logger.log(`User logged in: ${loginDto.email}`);

    return authResponse;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token using refresh token from cookie',
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
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies[COOKIE_CONFIG.REFRESH_TOKEN.name];

    if (!refreshToken) {
      this.clearRefreshTokenCookie(res);
      throw new UnauthorizedException('Refresh token not found');
    }

    try {
      const authResponse = await this.authService.refreshToken({
        refreshToken,
      });
      const newRefreshToken = await this.authService.createRefreshToken(
        authResponse.user.id,
      );

      this.setRefreshTokenCookie(res, newRefreshToken);

      return authResponse;
    } catch (error) {
      this.clearRefreshTokenCookie(res);
      this.logger.warn('Failed refresh token attempt');
      throw error;
    }
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
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
  @ApiOperation({ summary: 'Reset password using token from email' })
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

    this.setRefreshTokenCookie(res, refreshToken);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${authResponse.accessToken}`;

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
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies[COOKIE_CONFIG.REFRESH_TOKEN.name];

    if (refreshToken) {
      await this.authService.logout(userId, refreshToken);
    }

    this.clearRefreshTokenCookie(res);
    this.logger.log(`User logged out: ${userId}`);

    return { message: 'Logged out successfully' };
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
}
