import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

/**
 * Decorator to extract tenant ID from request context
 * For owners: Uses x-tenant-id header
 * For other roles: Uses tenantId from JWT payload
 */
export const TenantContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    let tenantId: string | null = null;

    // If user is an owner, they can specify tenant via header
    if (user?.role === 'owner') {
      tenantId = request.headers['x-tenant-id'] || null;
    } else {
      // For other roles, use their assigned tenantId
      tenantId = user?.tenantId || null;
    }

    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    return tenantId;
  },
);
