import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { ROLES } from '../constants';

/**
 * Decorator to extract tenant ID from request context
 * Priority:
 * 1. For CUSTOMER/GUEST: Use tenantId from qrContext (from QR token)
 * 2. For owners: Uses x-tenant-id header
 * 3. For other roles: Uses tenantId from JWT payload
 */
export const TenantContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    const qrContext = request.qrContext;

    let tenantId: string | null = null;

    // For CUSTOMER/GUEST roles, get tenantId from QR context (from QR token)
    if (user?.role === ROLES.CUSTOMER || user?.role === ROLES.GUEST || !user) {
      tenantId = qrContext?.tenantId || null;
    }
    // If user is an owner, they can specify tenant via header
    else if (user?.role === ROLES.OWNER) {
      tenantId = request.headers['x-tenant-id'] || null;
    } else {
      // For other roles (admin, waiter, kitchen), use their assigned tenantId
      tenantId = user?.tenantId || null;
    }

    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    return tenantId;
  },
);
