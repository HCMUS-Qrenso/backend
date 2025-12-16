import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma.service';
import { ROLES } from '../constants';

/**
 * Guard to validate tenant context for owners
 * Ensures that when an owner specifies x-tenant-id header,
 * they actually own that tenant
 */
@Injectable()
export class TenantOwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Only validate for owners
    if (user?.role !== ROLES.OWNER) {
      return true;
    }

    // Get tenant ID from header
    const tenantId = request.headers['x-tenant-id'];

    // If no tenant ID specified, they might be accessing owner-only endpoints
    if (!tenantId) {
      return true;
    }

    // Validate that the owner actually owns this tenant
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: tenantId,
        ownerId: user.id,
      },
    });

    if (!tenant) {
      throw new UnauthorizedException('You do not have access to this tenant');
    }

    return true;
  }
}
