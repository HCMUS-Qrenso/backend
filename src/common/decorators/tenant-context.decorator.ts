import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract tenant ID from request context
 * For owners: Uses x-tenant-id header
 * For other roles: Uses tenantId from JWT payload
 */
export const TenantContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If user is an owner, they can specify tenant via header
    if (user?.role === 'owner') {
      const tenantIdFromHeader = request.headers['x-tenant-id'];
      return tenantIdFromHeader || null;
    }

    // For other roles, use their assigned tenantId
    return user?.tenantId || null;
  },
);
