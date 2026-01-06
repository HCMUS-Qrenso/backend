import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES } from '../constants';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public (for QR token endpoints)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // For public endpoints, skip role checking here
    // Role validation will be done by QrTokenGuard which runs after
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Debug logging
    this.logger.debug(`User: ${JSON.stringify(user)}`);
    this.logger.debug(`Required roles: ${JSON.stringify(requiredRoles)}`);
    this.logger.debug(`User role: ${user?.role}`);

    // If user is authenticated via JWT, check their role
    if (user?.role) {
      const hasRole = requiredRoles.some((role) => user.role === role);
      this.logger.debug(`Has required role: ${hasRole}`);
      return hasRole;
    }

    // For guest users (no JWT token, request.user = null):
    // - If qrContext exists (QrTokenGuard already ran), allow if GUEST/CUSTOMER roles are required
    // - If qrContext doesn't exist yet (QrTokenGuard runs after), allow if GUEST/CUSTOMER roles are required
    //   (QrTokenGuard will validate the token and set qrContext)
    if (!user) {
      this.logger.debug('No user found in request - checking for guest access');
      // Check if GUEST or CUSTOMER roles are in required roles
      const allowsGuest = requiredRoles.some(
        (role) => role === ROLES.GUEST || role === ROLES.CUSTOMER,
      );

      if (allowsGuest) {
        // Allow guest users - QrTokenGuard will validate QR/session token
        this.logger.debug('Allowing guest access');
        return true;
      }
    }

    // For endpoints using QrTokenGuard, check if qrContext exists
    if (request.qrContext) {
      this.logger.debug('Found qrContext - checking guest roles');
      return requiredRoles.some(
        (role) => role === ROLES.GUEST || role === ROLES.CUSTOMER,
      );
    }

    this.logger.debug('Access denied - no valid user or qrContext');
    return false;
  }
}
