import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  Prisma,
  VoucherStatus,
  VoucherKind,
  DiscountType,
  ApplySource,
  Voucher,
} from '@prisma/client';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  QueryVouchersDto,
  ApplyVoucherDto,
  ApplyVoucherCodeDto,
  RevokeVoucherDto,
} from './dto';
import { t, executeFuzzySearch } from '../../common/utils';

interface OrderContext {
  orderId: string;
  tenantId: string;
  subtotal: number;
  customerId?: string;
  tableSessionId?: string;
  guestCount?: number;
}

interface VoucherWithRedemptionCount extends Voucher {
  _count?: { redemptions: number };
}

@Injectable()
export class VouchersService {
  private readonly logger = new Logger(VouchersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // ADMIN CRUD OPERATIONS
  // ============================================

  async create(tenantId: string, dto: CreateVoucherDto, createdById?: string) {
    // Validate discount values
    this.validateDiscountValues(dto);

    const voucher = await this.prisma.voucher.create({
      data: {
        tenantId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        kind: dto.kind,
        status: dto.status || VoucherStatus.draft,
        discountType: dto.discountType,
        percentOff: dto.percentOff,
        amountOff: dto.amountOff,
        maxDiscountAmount: dto.maxDiscountAmount,
        minSubtotal: dto.minSubtotal,
        minParty: dto.minParty,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        maxRedemptionsTotal: dto.maxRedemptionsTotal,
        maxRedemptionsPerCustomer: dto.maxRedemptionsPerCustomer,
        autoApply: dto.autoApply ?? false,
        isPublic: dto.isPublic ?? false,
        priority: dto.priority ?? 0,
        createdById,
      },
    });

    this.logger.log(`Voucher ${voucher.code} created for tenant ${tenantId}`);

    return {
      success: true,
      data: this.transformVoucher(voucher),
    };
  }

  async findAll(tenantId: string, query: QueryVouchersDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      kind,
      autoApply,
      isPublic,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.VoucherWhereInput = {
      tenantId,
      ...(status && { status }),
      ...(kind && { kind }),
      ...(autoApply !== undefined && { autoApply }),
      ...(isPublic !== undefined && { isPublic }),
    };

    // Search filter using fuzzy search with pg_trgm
    if (search) {
      const matchingIds = await executeFuzzySearch(this.prisma, {
        table: 'vouchers',
        searchFields: ['code_unaccent', 'name_unaccent'],
        searchTerm: search,
        tenantIdField: 'tenant_id',
        tenantId: tenantId,
        similarityThreshold: 0.2,
      });

      if (matchingIds.length === 0) {
        return {
          success: true,
          data: [],
          meta: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        };
      }

      where.id = { in: matchingIds };
    }

    const orderBy: Prisma.VoucherOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [vouchers, total] = await Promise.all([
      this.prisma.voucher.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: { select: { redemptions: true } },
        },
      }),
      this.prisma.voucher.count({ where }),
    ]);

    return {
      success: true,
      data: vouchers.map((v) => this.transformVoucher(v)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, voucherId: string) {
    const voucher = await this.prisma.voucher.findFirst({
      where: { id: voucherId, tenantId },
      include: {
        _count: { select: { redemptions: true, codes: true } },
      },
    });

    if (!voucher) {
      throw new NotFoundException(
        t('vouchers.voucherNotFound', 'Voucher not found'),
      );
    }

    return {
      success: true,
      data: this.transformVoucher(voucher),
    };
  }

  async update(tenantId: string, voucherId: string, dto: UpdateVoucherDto) {
    const existing = await this.prisma.voucher.findFirst({
      where: { id: voucherId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(
        t('vouchers.voucherNotFound', 'Voucher not found'),
      );
    }

    // Validate discount values if changing
    if (
      dto.discountType ||
      dto.percentOff !== undefined ||
      dto.amountOff !== undefined
    ) {
      this.validateDiscountValues({
        discountType: dto.discountType || existing.discountType,
        percentOff: dto.percentOff ?? Number(existing.percentOff),
        amountOff: dto.amountOff ?? Number(existing.amountOff),
      });
    }

    const voucher = await this.prisma.voucher.update({
      where: { id: voucherId },
      data: {
        ...(dto.code && { code: dto.code.toUpperCase() }),
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.kind && { kind: dto.kind }),
        ...(dto.status && { status: dto.status }),
        ...(dto.discountType && { discountType: dto.discountType }),
        ...(dto.percentOff !== undefined && { percentOff: dto.percentOff }),
        ...(dto.amountOff !== undefined && { amountOff: dto.amountOff }),
        ...(dto.maxDiscountAmount !== undefined && {
          maxDiscountAmount: dto.maxDiscountAmount,
        }),
        ...(dto.minSubtotal !== undefined && { minSubtotal: dto.minSubtotal }),
        ...(dto.minParty !== undefined && { minParty: dto.minParty }),
        ...(dto.startsAt !== undefined && {
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        }),
        ...(dto.endsAt !== undefined && {
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        }),
        ...(dto.maxRedemptionsTotal !== undefined && {
          maxRedemptionsTotal: dto.maxRedemptionsTotal,
        }),
        ...(dto.maxRedemptionsPerCustomer !== undefined && {
          maxRedemptionsPerCustomer: dto.maxRedemptionsPerCustomer,
        }),
        ...(dto.autoApply !== undefined && { autoApply: dto.autoApply }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
      },
      include: {
        _count: { select: { redemptions: true } },
      },
    });

    this.logger.log(`Voucher ${voucher.code} updated`);

    return {
      success: true,
      data: this.transformVoucher(voucher),
    };
  }

  async archive(tenantId: string, voucherId: string) {
    const existing = await this.prisma.voucher.findFirst({
      where: { id: voucherId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(
        t('vouchers.voucherNotFound', 'Voucher not found'),
      );
    }

    await this.prisma.voucher.update({
      where: { id: voucherId },
      data: { status: VoucherStatus.archived },
    });

    this.logger.log(`Voucher ${existing.code} archived`);

    return {
      success: true,
      message: t('vouchers.voucherArchived', 'Voucher archived'),
    };
  }

  // ============================================
  // ELIGIBILITY & DISCOUNT CALCULATION
  // ============================================

  /**
   * Find all applicable vouchers for an order
   */
  async findApplicableVouchers(context: OrderContext): Promise<Voucher[]> {
    const now = new Date();

    // Get all active vouchers for the tenant
    const vouchers = await this.prisma.voucher.findMany({
      where: {
        tenantId: context.tenantId,
        status: VoucherStatus.active,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [
          {
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
        ],
      },
      include: {
        _count: { select: { redemptions: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    // Filter by eligibility
    const applicableVouchers: Voucher[] = [];

    for (const voucher of vouchers) {
      if (
        await this.isVoucherEligible(
          voucher as VoucherWithRedemptionCount,
          context,
        )
      ) {
        applicableVouchers.push(voucher);
      }
    }

    return applicableVouchers;
  }

  /**
   * Check if a voucher is eligible for an order
   */
  async isVoucherEligible(
    voucher: VoucherWithRedemptionCount,
    context: OrderContext,
  ): Promise<boolean> {
    const now = new Date();

    // Check status
    if (voucher.status !== VoucherStatus.active) {
      return false;
    }

    // Check date range
    if (voucher.startsAt && voucher.startsAt > now) {
      return false;
    }
    if (voucher.endsAt && voucher.endsAt < now) {
      return false;
    }

    // Check minimum subtotal
    if (voucher.minSubtotal && context.subtotal < Number(voucher.minSubtotal)) {
      return false;
    }

    // Check minimum party size
    if (
      voucher.minParty &&
      context.guestCount &&
      context.guestCount < voucher.minParty
    ) {
      return false;
    }

    // Check total redemption limit
    if (voucher.maxRedemptionsTotal) {
      const redemptionCount =
        voucher._count?.redemptions ??
        (await this.getRedemptionCount(voucher.id));
      if (redemptionCount >= voucher.maxRedemptionsTotal) {
        return false;
      }
    }

    // Check per-customer limit (for logged-in users)
    if (voucher.maxRedemptionsPerCustomer && context.customerId) {
      const customerRedemptions = await this.prisma.voucherRedemption.count({
        where: {
          voucherId: voucher.id,
          order: { customerId: context.customerId },
          revokedAt: null,
        },
      });
      if (customerRedemptions >= voucher.maxRedemptionsPerCustomer) {
        return false;
      }
    }

    // Check per-session limit (for guests without customerId)
    if (
      voucher.maxRedemptionsPerCustomer &&
      !context.customerId &&
      context.tableSessionId
    ) {
      const sessionRedemptions = await this.prisma.voucherRedemption.count({
        where: {
          voucherId: voucher.id,
          order: { tableSessionId: context.tableSessionId },
          revokedAt: null,
        },
      });
      if (sessionRedemptions >= voucher.maxRedemptionsPerCustomer) {
        return false;
      }
    }

    // Check if already applied to this order
    const existingRedemption = await this.prisma.voucherRedemption.findFirst({
      where: {
        orderId: context.orderId,
        voucherId: voucher.id,
        revokedAt: null,
      },
    });
    if (existingRedemption) {
      return false;
    }

    return true;
  }

  /**
   * Calculate discount amount for a voucher
   */
  calculateDiscount(voucher: Voucher, subtotal: number): number {
    let discount = 0;

    if (voucher.discountType === DiscountType.percent && voucher.percentOff) {
      discount = subtotal * (Number(voucher.percentOff) / 100);

      // Apply max cap
      if (voucher.maxDiscountAmount) {
        discount = Math.min(discount, Number(voucher.maxDiscountAmount));
      }
    } else if (
      voucher.discountType === DiscountType.fixed_amount &&
      voucher.amountOff
    ) {
      discount = Number(voucher.amountOff);
    }

    // Never discount more than the subtotal
    return Math.min(discount, subtotal);
  }

  /**
   * Get the best voucher from a list (by priority, then by discount amount)
   */
  getBestVoucher(vouchers: Voucher[], subtotal: number): Voucher | null {
    if (vouchers.length === 0) return null;

    // Sort by priority (desc), then by calculated discount (desc)
    const sorted = [...vouchers].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return (
        this.calculateDiscount(b, subtotal) -
        this.calculateDiscount(a, subtotal)
      );
    });

    return sorted[0];
  }

  // ============================================
  // APPLY / REVOKE VOUCHERS
  // ============================================

  /**
   * Apply a voucher to an order (with race condition protection)
   * Rules:
   * - Customer (auto/code source) can only apply 1 voucher per order
   * - Staff can add additional vouchers on top of customer vouchers
   * - Discount is calculated sequentially (on remaining subtotal after previous discounts)
   */
  async applyVoucher(
    context: OrderContext,
    dto: ApplyVoucherDto,
    source: ApplySource,
    appliedById?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Get the voucher with lock
      const voucher = await tx.voucher.findFirst({
        where: {
          id: dto.voucherId,
          tenantId: context.tenantId,
          status: VoucherStatus.active,
        },
        include: {
          _count: { select: { redemptions: true } },
        },
      });

      if (!voucher) {
        throw new NotFoundException('Voucher not found or inactive');
      }

      // Check eligibility
      if (
        !(await this.isVoucherEligible(
          voucher as VoucherWithRedemptionCount,
          context,
        ))
      ) {
        throw new BadRequestException(
          t(
            'vouchers.voucherNotEligible',
            'Voucher is not eligible for this order',
          ),
        );
      }

      // Check if this voucher is already applied to this order
      const existingSameVoucher = await tx.voucherRedemption.findFirst({
        where: {
          orderId: context.orderId,
          voucherId: voucher.id,
          revokedAt: null,
        },
      });

      if (existingSameVoucher) {
        throw new ConflictException(
          t(
            'vouchers.voucherAlreadyApplied',
            'This voucher is already applied to this order',
          ),
        );
      }

      // Customer (auto/customer_code) can only apply 1 voucher
      // Staff can add additional vouchers
      if (source === ApplySource.auto || source === ApplySource.customer_code) {
        const customerVouchers = await tx.voucherRedemption.findFirst({
          where: {
            orderId: context.orderId,
            source: { in: [ApplySource.auto, ApplySource.customer_code] },
            revokedAt: null,
          },
        });

        if (customerVouchers) {
          throw new ConflictException(
            t(
              'vouchers.customerHasVoucherApplied',
              'Order already has a customer voucher applied. Only staff can add additional vouchers.',
            ),
          );
        }
      }

      // Race condition check for usage limits
      if (voucher.maxRedemptionsTotal) {
        const currentCount = await tx.voucherRedemption.count({
          where: { voucherId: voucher.id, revokedAt: null },
        });
        if (currentCount >= voucher.maxRedemptionsTotal) {
          throw new BadRequestException(
            t(
              'vouchers.voucherUsageLimitReached',
              'Voucher has reached its usage limit',
            ),
          );
        }
      }

      // Get current order totals and existing discounts for sequential calculation
      const order = await tx.order.findUnique({
        where: { id: context.orderId },
        select: {
          subtotal: true,
          taxAmount: true,
          discountAmount: true,
          totalAmount: true,
        },
      });

      if (!order) {
        throw new NotFoundException(
          t('vouchers.orderNotFound', 'Order not found'),
        );
      }

      // Sequential discount: calculate on remaining subtotal after existing discounts
      const currentSubtotalAfterDiscounts =
        Number(order.subtotal) - Number(order.discountAmount);
      const discountAmount = this.calculateDiscount(
        voucher,
        currentSubtotalAfterDiscounts,
      );

      // Check if there's a revoked redemption for the same voucher (for re-applying)
      const revokedRedemption = await tx.voucherRedemption.findFirst({
        where: {
          orderId: context.orderId,
          voucherId: voucher.id,
          revokedAt: { not: null }, // Was revoked
        },
      });

      let redemption;

      if (revokedRedemption) {
        // Reactivate the revoked redemption
        redemption = await tx.voucherRedemption.update({
          where: { id: revokedRedemption.id },
          data: {
            source,
            appliedById,
            discountAmount,
            notes: dto.notes,
            revokedAt: null, // Clear revoke
            revokedById: null,
            revokeReason: null,
            snapshot: {
              code: voucher.code,
              name: voucher.name,
              discountType: voucher.discountType,
              percentOff: voucher.percentOff
                ? Number(voucher.percentOff)
                : null,
              amountOff: voucher.amountOff ? Number(voucher.amountOff) : null,
              maxDiscountAmount: voucher.maxDiscountAmount
                ? Number(voucher.maxDiscountAmount)
                : null,
            },
          },
          include: {
            voucher: { select: { code: true, name: true } },
          },
        });
      } else {
        // Create new redemption record
        redemption = await tx.voucherRedemption.create({
          data: {
            tenantId: context.tenantId,
            orderId: context.orderId,
            voucherId: voucher.id,
            source,
            appliedById,
            discountAmount,
            notes: dto.notes,
            snapshot: {
              code: voucher.code,
              name: voucher.name,
              discountType: voucher.discountType,
              percentOff: voucher.percentOff
                ? Number(voucher.percentOff)
                : null,
              amountOff: voucher.amountOff ? Number(voucher.amountOff) : null,
              maxDiscountAmount: voucher.maxDiscountAmount
                ? Number(voucher.maxDiscountAmount)
                : null,
            },
          },
          include: {
            voucher: { select: { code: true, name: true } },
          },
        });
      }

      // Update order totals
      const newDiscountAmount = Number(order.discountAmount) + discountAmount;
      const newTotalAmount =
        Number(order.subtotal) + Number(order.taxAmount) - newDiscountAmount;

      await tx.order.update({
        where: { id: context.orderId },
        data: {
          discountAmount: newDiscountAmount,
          totalAmount: Math.max(0, newTotalAmount),
        },
      });

      this.logger.log(
        `Voucher ${voucher.code} applied to order ${context.orderId} by ${source}`,
      );

      return {
        success: true,
        data: {
          redemptionId: redemption.id,
          voucherCode: voucher.code,
          voucherName: voucher.name,
          discountAmount,
        },
      };
    });
  }

  /**
   * Apply a voucher by code (for customer-entered codes)
   */
  async applyVoucherByCode(context: OrderContext, dto: ApplyVoucherCodeDto) {
    const code = dto.code.toUpperCase();

    // First check VoucherCode table
    let voucherId: string | null = null;

    const voucherCode = await this.prisma.voucherCode.findFirst({
      where: {
        tenantId: context.tenantId,
        code,
        isActive: true,
      },
    });

    if (voucherCode) {
      voucherId = voucherCode.voucherId;
    } else {
      // Check main Voucher table
      const voucher = await this.prisma.voucher.findFirst({
        where: {
          tenantId: context.tenantId,
          code,
          status: VoucherStatus.active,
        },
      });

      if (!voucher) {
        throw new NotFoundException(
          t('vouchers.invalidVoucherCode', 'Invalid voucher code'),
        );
      }

      // Only code-type vouchers can be entered by customers
      if (
        voucher.kind !== VoucherKind.code &&
        voucher.kind !== VoucherKind.automatic
      ) {
        throw new BadRequestException(
          t(
            'vouchers.voucherCannotBeAppliedByCode',
            'This voucher cannot be applied by code',
          ),
        );
      }

      voucherId = voucher.id;
    }

    return this.applyVoucher(context, { voucherId }, ApplySource.customer_code);
  }

  /**
   * Revoke a voucher from an order
   */
  async revokeVoucher(
    tenantId: string,
    orderId: string,
    redemptionId: string,
    dto: RevokeVoucherDto,
    revokedById: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const redemption = await tx.voucherRedemption.findFirst({
        where: {
          id: redemptionId,
          tenantId,
          orderId,
          revokedAt: null,
        },
      });

      if (!redemption) {
        throw new NotFoundException(
          t(
            'vouchers.voucherRedemptionNotFound',
            'Voucher redemption not found or already revoked',
          ),
        );
      }

      // Update redemption
      await tx.voucherRedemption.update({
        where: { id: redemptionId },
        data: {
          revokedAt: new Date(),
          revokedById,
          revokeReason: dto.reason,
        },
      });

      // Update order totals
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { subtotal: true, taxAmount: true, discountAmount: true },
      });

      if (order) {
        const newDiscountAmount = Math.max(
          0,
          Number(order.discountAmount) - Number(redemption.discountAmount),
        );
        const newTotalAmount =
          Number(order.subtotal) + Number(order.taxAmount) - newDiscountAmount;

        await tx.order.update({
          where: { id: orderId },
          data: {
            discountAmount: newDiscountAmount,
            totalAmount: Math.max(0, newTotalAmount),
          },
        });
      }

      this.logger.log(
        `Voucher redemption ${redemptionId} revoked from order ${orderId}`,
      );

      return {
        success: true,
        message: t(
          'vouchers.voucherRevokedSuccessfully',
          'Voucher revoked successfully',
        ),
      };
    });
  }

  // ============================================
  // AUTO-APPLY LOGIC
  // ============================================

  /**
   * Get auto-apply vouchers and apply the best one
   */
  async autoApplyBestVoucher(context: OrderContext): Promise<void> {
    const applicableVouchers = await this.findApplicableVouchers(context);

    // Filter to only auto-apply vouchers
    const autoApplyVouchers = applicableVouchers.filter((v) => v.autoApply);

    if (autoApplyVouchers.length === 0) {
      return;
    }

    const bestVoucher = this.getBestVoucher(
      autoApplyVouchers,
      context.subtotal,
    );

    if (bestVoucher) {
      try {
        await this.applyVoucher(
          context,
          { voucherId: bestVoucher.id },
          ApplySource.auto,
        );
      } catch (error) {
        // Log but don't fail the order
        this.logger.warn(
          `Failed to auto-apply voucher ${bestVoucher.code}: ${error.message}`,
        );
      }
    }
  }

  // ============================================
  // PUBLIC VOUCHERS FOR CUSTOMER
  // ============================================

  /**
   * Get public active vouchers for customer display
   * @param tenantId - Tenant ID
   * @param tableSessionId - Optional session ID to check which vouchers are already used
   */
  async getPublicVouchers(tenantId: string, tableSessionId?: string) {
    const now = new Date();

    const vouchers = await this.prisma.voucher.findMany({
      where: {
        tenantId,
        status: VoucherStatus.active,
        isPublic: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [
          {
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        discountType: true,
        percentOff: true,
        amountOff: true,
        maxDiscountAmount: true,
        minSubtotal: true,
        startsAt: true,
        endsAt: true,
        autoApply: true,
      },
      orderBy: { priority: 'desc' },
    });

    // Get vouchers already used in this session
    let usedVoucherIds: string[] = [];
    if (tableSessionId) {
      const usedRedemptions = await this.prisma.voucherRedemption.findMany({
        where: {
          order: { tableSessionId },
          revokedAt: null,
        },
        select: { voucherId: true },
      });
      usedVoucherIds = usedRedemptions.map((r) => r.voucherId);
    }

    return {
      success: true,
      data: vouchers.map((v) => ({
        ...v,
        percentOff: v.percentOff ? Number(v.percentOff) : null,
        amountOff: v.amountOff ? Number(v.amountOff) : null,
        maxDiscountAmount: v.maxDiscountAmount
          ? Number(v.maxDiscountAmount)
          : null,
        minSubtotal: v.minSubtotal ? Number(v.minSubtotal) : null,
        isUsedInSession: usedVoucherIds.includes(v.id),
      })),
    };
  }

  /**
   * Get staff-only vouchers for waiter to apply
   */
  async getStaffVouchers(tenantId: string) {
    const now = new Date();

    const vouchers = await this.prisma.voucher.findMany({
      where: {
        tenantId,
        status: VoucherStatus.active,
        kind: VoucherKind.staff_only,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [
          {
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
        ],
      },
      include: {
        _count: { select: { redemptions: true } },
      },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });

    return {
      success: true,
      data: vouchers.map((v) => this.transformVoucher(v)),
    };
  }

  // ============================================
  // REDEMPTION HISTORY
  // ============================================

  async getRedemptions(
    tenantId: string,
    voucherId: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const [redemptions, total] = await Promise.all([
      this.prisma.voucherRedemption.findMany({
        where: { tenantId, voucherId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.voucherRedemption.count({ where: { tenantId, voucherId } }),
    ]);

    return {
      success: true,
      data: redemptions.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        orderNumber: r.order.orderNumber,
        orderTotal: Number(r.order.totalAmount),
        discountAmount: Number(r.discountAmount),
        source: r.source,
        notes: r.notes,
        revokedAt: r.revokedAt,
        revokeReason: r.revokeReason,
        createdAt: r.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private validateDiscountValues(dto: {
    discountType: DiscountType;
    percentOff?: number;
    amountOff?: number;
  }) {
    if (dto.discountType === DiscountType.percent) {
      if (!dto.percentOff || dto.percentOff <= 0 || dto.percentOff > 100) {
        throw new BadRequestException('Percent off must be between 0 and 100');
      }
    } else if (dto.discountType === DiscountType.fixed_amount) {
      if (!dto.amountOff || dto.amountOff <= 0) {
        throw new BadRequestException('Amount off must be greater than 0');
      }
    }
  }

  private async getRedemptionCount(voucherId: string): Promise<number> {
    return this.prisma.voucherRedemption.count({
      where: { voucherId, revokedAt: null },
    });
  }

  private transformVoucher(voucher: any) {
    return {
      id: voucher.id,
      code: voucher.code,
      name: voucher.name,
      description: voucher.description,
      status: voucher.status,
      kind: voucher.kind,
      discountType: voucher.discountType,
      percentOff: voucher.percentOff ? Number(voucher.percentOff) : null,
      amountOff: voucher.amountOff ? Number(voucher.amountOff) : null,
      maxDiscountAmount: voucher.maxDiscountAmount
        ? Number(voucher.maxDiscountAmount)
        : null,
      minSubtotal: voucher.minSubtotal ? Number(voucher.minSubtotal) : null,
      minParty: voucher.minParty,
      startsAt: voucher.startsAt,
      endsAt: voucher.endsAt,
      maxRedemptionsTotal: voucher.maxRedemptionsTotal,
      maxRedemptionsPerCustomer: voucher.maxRedemptionsPerCustomer,
      autoApply: voucher.autoApply,
      isPublic: voucher.isPublic,
      stackable: voucher.stackable,
      priority: voucher.priority,
      redemptionCount: voucher._count?.redemptions ?? 0,
      codeCount: voucher._count?.codes ?? 0,
      createdAt: voucher.createdAt,
      updatedAt: voucher.updatedAt,
    };
  }
}
