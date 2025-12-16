import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { QueryTenantsDto } from './dto';
import { t } from '../../common/utils';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all tenants owned by a specific owner
   */
  async findAllByOwner(ownerId: string, query: QueryTenantsDto) {
    const { page = 1, limit = 10, search, status, subscription_tier } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    interface WhereClause {
      ownerId: string;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        slug?: { contains: string; mode: 'insensitive' };
      }>;
      status?: string;
      subscriptionTier?: string;
    }

    const where: WhereClause = {
      ownerId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (subscription_tier) {
      where.subscriptionTier = subscription_tier;
    }

    // Get total count
    const total = await this.prisma.tenant.count({ where });

    // Get tenants with statistics
    const tenants = await this.prisma.tenant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            tables: true,
            zones: true,
            orders: true,
          },
        },
      },
    });

    // Format response
    const formattedTenants = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      address: tenant.address,
      status: tenant.status,
      subscription_tier: tenant.subscriptionTier,
      settings: tenant.settings,
      statistics: {
        total_users: tenant._count.users,
        total_tables: tenant._count.tables,
        total_zones: tenant._count.zones,
        total_orders: tenant._count.orders,
      },
      created_at: tenant.createdAt,
      updated_at: tenant.updatedAt,
    }));

    return {
      success: true,
      data: {
        tenants: formattedTenants,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Get summary statistics for all tenants owned by owner
   */
  async getOwnerStats(ownerId: string) {
    const totalTenants = await this.prisma.tenant.count({
      where: { ownerId },
    });

    const activeTenants = await this.prisma.tenant.count({
      where: { ownerId, status: 'active' },
    });

    const inactiveTenants = await this.prisma.tenant.count({
      where: { ownerId, status: 'inactive' },
    });

    const suspendedTenants = await this.prisma.tenant.count({
      where: { ownerId, status: 'suspended' },
    });

    // Get subscription tier breakdown
    const tierStats = await this.prisma.tenant.groupBy({
      by: ['subscriptionTier'],
      where: { ownerId },
      _count: true,
    });

    const subscriptionBreakdown = tierStats.reduce(
      (acc, tier) => {
        acc[tier.subscriptionTier] = tier._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      success: true,
      data: {
        total_tenants: totalTenants,
        active_tenants: activeTenants,
        inactive_tenants: inactiveTenants,
        suspended_tenants: suspendedTenants,
        subscription_breakdown: subscriptionBreakdown,
      },
    };
  }

  /**
   * Get detailed information about a specific tenant
   */
  async findOne(tenantId: string) {
    // Fetch tenant with all details
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            users: true,
            tables: true,
            zones: true,
            orders: true,
            categories: true,
            menuItems: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(
        t('tenants.tenantNotFound', 'Tenant not found'),
      );
    }

    return {
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        address: tenant.address,
        status: tenant.status,
        subscription_tier: tenant.subscriptionTier,
        settings: tenant.settings,
        owner: {
          id: tenant.owner.id,
          full_name: tenant.owner.fullName,
          email: tenant.owner.email,
        },
        statistics: {
          total_users: tenant._count.users,
          total_tables: tenant._count.tables,
          total_zones: tenant._count.zones,
          total_orders: tenant._count.orders,
          total_categories: tenant._count.categories,
          total_menu_items: tenant._count.menuItems,
        },
        created_at: tenant.createdAt,
        updated_at: tenant.updatedAt,
      },
    };
  }
}
