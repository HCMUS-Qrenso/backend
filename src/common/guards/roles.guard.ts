import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES } from '../constants';

@Injectable()
export class RolesGuard implements CanActivate {
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

    // If user is authenticated via JWT, check their role
    if (user?.role) {
      return requiredRoles.some((role) => user.role === role);
    }

    // For endpoints using QrTokenGuard, check if qrContext exists
    if (request.qrContext) {
      return requiredRoles.some(
        (role) => role === ROLES.GUEST || role === ROLES.CUSTOMER,
      );
    }

    return false;
  }
}
