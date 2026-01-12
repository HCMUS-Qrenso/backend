import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { QueryTenantsDto, UpdateTenantSettingsDto } from './dto';
import { t, executeFuzzySearch } from '../../common/utils';

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
      id?: { in: string[] };
      status?: string;
      subscriptionTier?: string;
    }

    const where: WhereClause = {
      ownerId,
    };

    // Search filter using fuzzy search with pg_trgm
    if (search) {
      const matchingIds = await executeFuzzySearch(this.prisma, {
        table: 'tenants',
        searchFields: ['name_unaccent', 'slug_unaccent'],
        searchTerm: search,
        tenantIdField: 'owner_id',
        tenantId: ownerId,
        similarityThreshold: 0.2,
      });

      if (matchingIds.length === 0) {
        return {
          success: true,
          data: {
            tenants: [],
            pagination: {
              page,
              limit,
              total: 0,
              total_pages: 0,
            },
          },
        };
      }

      where.id = { in: matchingIds };
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
        notifySound: true,
        // Receipt settings
        receiptHeader: true,
        receiptFooter: true,
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
          sound: tenant.notifySound,
        },
        // Receipt
        receipt: {
          header: tenant.receiptHeader,
          footer: tenant.receiptFooter,
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

    // Restaurant information
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.image !== undefined) updateData.image = dto.image;

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
    if (dto.notifySound !== undefined) updateData.notifySound = dto.notifySound;

    // Receipt settings
    if (dto.receiptHeader !== undefined)
      updateData.receiptHeader = dto.receiptHeader;
    if (dto.receiptFooter !== undefined)
      updateData.receiptFooter = dto.receiptFooter;
    if (dto.invoicePrefix !== undefined)
      updateData.invoicePrefix = dto.invoicePrefix;

    // QR Payment settings
    if (dto.qrPayosApiKey !== undefined)
      updateData.payosApiKey = dto.qrPayosApiKey;
    if (dto.qrPayosChecksumKey !== undefined)
      updateData.payosChecksumKey = dto.qrPayosChecksumKey;
    if (dto.qrPayosClientId !== undefined)
      updateData.payosClientId = dto.qrPayosClientId;
    // Update tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    this.logger.log(`Settings updated for tenant ${tenantId}`);

    // Return updated settings
    return this.getSettings(tenantId);
  }

  // ============================================
  // Onboarding Methods
  // ============================================

  /**
   * Get onboarding status and draft
   */
  async getOnboarding(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        address: true,
        image: true,
        onboardingCompleted: true,
        onboardingDraft: true,
        // Current settings for prefill
        currency: true,
        currencySymbol: true,
        timezone: true,
        dateFormat: true,
        language: true,
        taxRate: true,
        taxInclusive: true,
        taxLabel: true,
        serviceChargeEnabled: true,
        serviceChargeRate: true,
        serviceChargeTaxable: true,
        serviceChargeMinParty: true,
        operatingHours: true,
        minOrderValue: true,
        estimatedPrepTime: true,
        allowSpecialInstructions: true,
        sessionTimeoutMinutes: true,
        requireGuestCount: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    return {
      success: true,
      data: {
        completed: tenant.onboardingCompleted,
        draft: tenant.onboardingDraft || null,
        current_settings: {
          restaurant: {
            name: tenant.name,
            address: tenant.address,
            image: tenant.image,
          },
          locale: {
            currency: tenant.currency,
            currency_symbol: tenant.currencySymbol,
            timezone: tenant.timezone,
            date_format: tenant.dateFormat,
            language: tenant.language,
          },
          tax_charge: {
            tax_rate: Number(tenant.taxRate),
            tax_inclusive: tenant.taxInclusive,
            tax_label: tenant.taxLabel,
            service_charge_enabled: tenant.serviceChargeEnabled,
            service_charge_rate: Number(tenant.serviceChargeRate),
            service_charge_taxable: tenant.serviceChargeTaxable,
            service_charge_min_party: tenant.serviceChargeMinParty,
          },
          hours: {
            operating_hours: tenant.operatingHours,
          },
          order_rules: {
            min_value: tenant.minOrderValue
              ? Number(tenant.minOrderValue)
              : null,
            estimated_prep_time: tenant.estimatedPrepTime,
            allow_special_instructions: tenant.allowSpecialInstructions,
            session_timeout_minutes: tenant.sessionTimeoutMinutes,
            require_guest_count: tenant.requireGuestCount,
          },
        },
      },
    };
  }

  /**
   * Save onboarding draft (partial updates)
   */
  async saveOnboardingDraft(tenantId: string, draft: any) {
    // Get existing draft
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { onboardingDraft: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    // Merge with existing draft
    const existingDraft = (tenant.onboardingDraft as object) || {};
    const mergedDraft = { ...existingDraft, ...draft };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { onboardingDraft: mergedDraft },
    });

    this.logger.log(`Onboarding draft saved for tenant ${tenantId}`);

    return {
      success: true,
      data: { draft: mergedDraft },
    };
  }

  /**
   * Complete onboarding - apply draft to actual settings
   */
  async completeOnboarding(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { onboardingDraft: true, onboardingCompleted: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const draft = tenant.onboardingDraft as any;
    if (!draft) {
      throw new BadRequestException(
        'No onboarding draft found. Please complete onboarding steps first.',
      );
    }

    // Validate required fields
    if (!draft.restaurant?.name) {
      throw new BadRequestException('Restaurant name is required');
    }

    // Build update data from draft
    const updateData: Record<string, any> = {};

    // Restaurant
    if (draft.restaurant) {
      if (draft.restaurant.name) updateData.name = draft.restaurant.name;
      if (draft.restaurant.address !== undefined)
        updateData.address = draft.restaurant.address;
      if (draft.restaurant.image !== undefined)
        updateData.image = draft.restaurant.image;
    }

    // Locale
    if (draft.locale) {
      if (draft.locale.currency) updateData.currency = draft.locale.currency;
      if (draft.locale.currency_symbol)
        updateData.currencySymbol = draft.locale.currency_symbol;
      if (draft.locale.timezone) updateData.timezone = draft.locale.timezone;
      if (draft.locale.date_format)
        updateData.dateFormat = draft.locale.date_format;
      if (draft.locale.language) updateData.language = draft.locale.language;
    }

    // Tax & Charges
    if (draft.tax_charge) {
      if (draft.tax_charge.tax_rate !== undefined)
        updateData.taxRate = draft.tax_charge.tax_rate;
      if (draft.tax_charge.tax_inclusive !== undefined)
        updateData.taxInclusive = draft.tax_charge.tax_inclusive;
      if (draft.tax_charge.tax_label)
        updateData.taxLabel = draft.tax_charge.tax_label;
      if (draft.tax_charge.service_charge_enabled !== undefined)
        updateData.serviceChargeEnabled =
          draft.tax_charge.service_charge_enabled;
      if (draft.tax_charge.service_charge_rate !== undefined)
        updateData.serviceChargeRate = draft.tax_charge.service_charge_rate;
      if (draft.tax_charge.service_charge_taxable !== undefined)
        updateData.serviceChargeTaxable =
          draft.tax_charge.service_charge_taxable;
      if (draft.tax_charge.service_charge_min_party !== undefined)
        updateData.serviceChargeMinParty =
          draft.tax_charge.service_charge_min_party;
    }

    // Operating Hours
    if (draft.hours?.operating_hours) {
      updateData.operatingHours = draft.hours.operating_hours;
    }

    // Order Rules
    if (draft.order_rules) {
      if (draft.order_rules.min_value !== undefined)
        updateData.minOrderValue = draft.order_rules.min_value;
      if (draft.order_rules.estimated_prep_time !== undefined)
        updateData.estimatedPrepTime = draft.order_rules.estimated_prep_time;
      if (draft.order_rules.allow_special_instructions !== undefined)
        updateData.allowSpecialInstructions =
          draft.order_rules.allow_special_instructions;
      if (draft.order_rules.session_timeout_minutes !== undefined)
        updateData.sessionTimeoutMinutes =
          draft.order_rules.session_timeout_minutes;
      if (draft.order_rules.require_guest_count !== undefined)
        updateData.requireGuestCount = draft.order_rules.require_guest_count;
    }

    // Mark as completed
    updateData.onboardingCompleted = true;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    this.logger.log(`Onboarding completed for tenant ${tenantId}`);

    return {
      success: true,
      message: 'Onboarding completed successfully',
    };
  }
}
