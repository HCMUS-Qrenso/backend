import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { QueryTenantsDto, UpdateTenantSettingsDto } from './dto';
import { t } from '../../common/utils';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all tenants owned by a specific owner
   */
  async findAllByOwner(ownerId: string, query: QueryTenantsDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      subscription_tier,
      sort_by = 'createdAt',
      sort_order = 'desc',
    } = query;
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

    // Validate and set orderBy
    const validSortFields = [
      'name',
      'slug',
      'status',
      'subscriptionTier',
      'createdAt',
      'updatedAt',
    ];
    const orderByField = validSortFields.includes(sort_by)
      ? sort_by
      : 'createdAt';
    const orderBy = { [orderByField]: sort_order };

    // Get total count
    const total = await this.prisma.tenant.count({ where });

    // Get tenants with statistics
    const tenants = await this.prisma.tenant.findMany({
      where,
      skip,
      take: limit,
      orderBy,
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
      image: tenant.image,
      status: tenant.status,
      subscription_tier: tenant.subscriptionTier,
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
    // Get tenant status breakdown in a single query
    const statusStats = await this.prisma.tenant.groupBy({
      by: ['status'],
      where: { ownerId },
      _count: true,
    });

    // Calculate status counts from grouped results
    const totalTenants = statusStats.reduce(
      (sum, stat) => sum + stat._count,
      0,
    );
    const activeTenants =
      statusStats.find((stat) => stat.status === 'active')?._count || 0;
    const inactiveTenants =
      statusStats.find((stat) => stat.status === 'inactive')?._count || 0;
    const suspendedTenants =
      statusStats.find((stat) => stat.status === 'suspended')?._count || 0;

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
        image: tenant.image,
        status: tenant.status,
        subscription_tier: tenant.subscriptionTier,
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

  /**
   * Get settings for a specific tenant
   */
  async getSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        address: true,
        image: true,
        // General settings
        currency: true,
        currencySymbol: true,
        timezone: true,
        dateFormat: true,
        language: true,
        phone: true,
        contactEmail: true,
        // Tax settings
        taxRate: true,
        taxInclusive: true,
        taxLabel: true,
        // Service charge settings
        serviceChargeEnabled: true,
        serviceChargeRate: true,
        serviceChargeTaxable: true,
        serviceChargeMinParty: true,
        // Operating hours
        operatingHours: true,
        // Order settings
        minOrderValue: true,
        estimatedPrepTime: true,
        allowSpecialInstructions: true,
        sessionTimeoutMinutes: true,
        requireGuestCount: true,
        // Notification settings
        notifySoundEnabled: true,
        notifyEmailEnabled: true,
        notifyEmail: true,
        // Receipt settings
        receiptHeader: true,
        receiptFooter: true,
        receiptShowLogo: true,
        invoicePrefix: true,
        // Payment settings
        payosApiKey: true,
        payosChecksumKey: true,
        payosClientId: true,
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
        address: tenant.address,
        image: tenant.image,
        // General
        general: {
          currency: tenant.currency,
          currency_symbol: tenant.currencySymbol,
          timezone: tenant.timezone,
          date_format: tenant.dateFormat,
          language: tenant.language,
          phone: tenant.phone,
          contact_email: tenant.contactEmail,
        },
        // Tax
        tax: {
          rate: Number(tenant.taxRate),
          inclusive: tenant.taxInclusive,
          label: tenant.taxLabel,
        },
        // Service charge
        service_charge: {
          enabled: tenant.serviceChargeEnabled,
          rate: Number(tenant.serviceChargeRate),
          taxable: tenant.serviceChargeTaxable,
          min_party: tenant.serviceChargeMinParty,
        },
        // Operating hours
        operating_hours: tenant.operatingHours,
        // Order settings
        order: {
          min_value: tenant.minOrderValue ? Number(tenant.minOrderValue) : null,
          estimated_prep_time: tenant.estimatedPrepTime,
          allow_special_instructions: tenant.allowSpecialInstructions,
          session_timeout_minutes: tenant.sessionTimeoutMinutes,
          require_guest_count: tenant.requireGuestCount,
        },
        // Notifications
        notifications: {
          sound_enabled: tenant.notifySoundEnabled,
          email_enabled: tenant.notifyEmailEnabled,
          email: tenant.notifyEmail,
        },
        // Receipt
        receipt: {
          header: tenant.receiptHeader,
          footer: tenant.receiptFooter,
          show_logo: tenant.receiptShowLogo,
          invoice_prefix: tenant.invoicePrefix,
        },
        // QR Payment
        qr_payment: {
          payos_api_key: tenant.payosApiKey,
          payos_checksum_key: tenant.payosChecksumKey,
          payos_client_id: tenant.payosClientId,
        },
      },
    };
  }

  /**
   * Update settings for a specific tenant
   */
  async updateSettings(tenantId: string, dto: UpdateTenantSettingsDto) {
    // Check tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException(
        t('tenants.tenantNotFound', 'Tenant not found'),
      );
    }

    // Build update data - only include fields that are provided
    const updateData: Record<string, unknown> = {};

    // General settings
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.currencySymbol !== undefined)
      updateData.currencySymbol = dto.currencySymbol;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.dateFormat !== undefined) updateData.dateFormat = dto.dateFormat;
    if (dto.language !== undefined) updateData.language = dto.language;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.contactEmail !== undefined)
      updateData.contactEmail = dto.contactEmail;

    // Tax settings
    if (dto.taxRate !== undefined) updateData.taxRate = dto.taxRate;
    if (dto.taxInclusive !== undefined)
      updateData.taxInclusive = dto.taxInclusive;
    if (dto.taxLabel !== undefined) updateData.taxLabel = dto.taxLabel;

    // Service charge settings
    if (dto.serviceChargeEnabled !== undefined)
      updateData.serviceChargeEnabled = dto.serviceChargeEnabled;
    if (dto.serviceChargeRate !== undefined)
      updateData.serviceChargeRate = dto.serviceChargeRate;
    if (dto.serviceChargeTaxable !== undefined)
      updateData.serviceChargeTaxable = dto.serviceChargeTaxable;
    if (dto.serviceChargeMinParty !== undefined)
      updateData.serviceChargeMinParty = dto.serviceChargeMinParty;

    // Operating hours
    if (dto.operatingHours !== undefined)
      updateData.operatingHours = dto.operatingHours;

    // Order settings
    if (dto.minOrderValue !== undefined)
      updateData.minOrderValue = dto.minOrderValue;
    if (dto.estimatedPrepTime !== undefined)
      updateData.estimatedPrepTime = dto.estimatedPrepTime;
    if (dto.allowSpecialInstructions !== undefined)
      updateData.allowSpecialInstructions = dto.allowSpecialInstructions;
    if (dto.sessionTimeoutMinutes !== undefined)
      updateData.sessionTimeoutMinutes = dto.sessionTimeoutMinutes;
    if (dto.requireGuestCount !== undefined)
      updateData.requireGuestCount = dto.requireGuestCount;

    // Notification settings
    if (dto.notifySoundEnabled !== undefined)
      updateData.notifySoundEnabled = dto.notifySoundEnabled;
    if (dto.notifyEmailEnabled !== undefined)
      updateData.notifyEmailEnabled = dto.notifyEmailEnabled;
    if (dto.notifyEmail !== undefined) updateData.notifyEmail = dto.notifyEmail;

    // Receipt settings
    if (dto.receiptHeader !== undefined)
      updateData.receiptHeader = dto.receiptHeader;
    if (dto.receiptFooter !== undefined)
      updateData.receiptFooter = dto.receiptFooter;
    if (dto.receiptShowLogo !== undefined)
      updateData.receiptShowLogo = dto.receiptShowLogo;
    if (dto.invoicePrefix !== undefined)
      updateData.invoicePrefix = dto.invoicePrefix;

    // QR Payment settings
    if (dto.qrPayosApiKey !== undefined)
      updateData.qrPayosApiKey = dto.qrPayosApiKey;
    if (dto.qrPayosChecksumKey !== undefined)
      updateData.qrPayosChecksumKey = dto.qrPayosChecksumKey;
    if (dto.qrPayosClientId !== undefined)
      updateData.qrPayosClientId = dto.qrPayosClientId;

    // Update tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    this.logger.log(`Settings updated for tenant ${tenantId}`);

    // Return updated settings
    return this.getSettings(tenantId);
  }
}
