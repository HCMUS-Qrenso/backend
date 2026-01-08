import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

/**
 * JWT Authentication Guard with optional authentication support
 *
 * Behavior:
 * - If Authorization header is missing → Skip (set user = null for guest users)
 * - If accessToken is provided → Validate and set request.user
 * - If token is invalid/expired → Throw error
 *
 * Guest users (no Authorization header) will have request.user = null
 * and will be authenticated via QrTokenGuard which validates
 * QR/session tokens and sets qrContext with tenant information.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Skip authentication for public routes
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    // If no Authorization header, skip JWT authentication
    // Guest users will be authenticated via QrTokenGuard
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Set user = null for guest users
      request.user = null;
      return true;
    }

    // Try to activate JWT authentication
    return super.canActivate(context) as Promise<boolean>;
  }

  /**
   * Handle authentication result
   * Only called if Authorization header was present
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If token is expired, throw error
    if (info && info.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Token expired');
    }

    // If there's an error or invalid token, throw
    if (err || (info && info.name === 'JsonWebTokenError')) {
      throw err || new UnauthorizedException('Invalid token');
    }

    // Valid token - return user
    return user;
  }
}
