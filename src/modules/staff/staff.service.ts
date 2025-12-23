import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { t } from '../../common/utils';
import {
  CreateStaffDto,
  UpdateStaffDto,
  UpdateStatusDto,
  QueryStaffDto,
} from './dto';
import { EmailService, TokenService } from '../auth/services';

// Staff roles that this module manages
const STAFF_ROLES: string[] = ['waiter', 'kitchen_staff'];

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Format user data to staff response format
   */
  private formatStaffResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      tenantId: user.tenantId,
      emailVerified: user.emailVerified,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Get paginated list of staff with filtering
   */
  async findAll(tenantId: string, query: QueryStaffDto) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      emailVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause - only staff roles for this tenant
    const where: any = {
      tenantId,
      role: { in: STAFF_ROLES },
    };

    // Apply filters
    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (emailVerified !== undefined) {
      where.emailVerified = emailVerified;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Validate and set orderBy
    const validSortFields = ['createdAt', 'fullName', 'lastLoginAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderBy = { [orderByField]: sortOrder };

    // Get total count
    const total = await this.prisma.user.count({ where });

    // Get staff members
    const staff = await this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    // Format response
    const items = staff.map((user) => this.formatStaffResponse(user));

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get staff statistics
   */
  async getStats(tenantId: string) {
    const baseWhere = {
      tenantId,
      role: { in: STAFF_ROLES },
    };

    // Get counts by role and status
    const [
      totalWaiter,
      activeWaiter,
      inactiveWaiter,
      suspendedWaiter,
      totalKitchen,
      activeKitchen,
      inactiveKitchen,
      suspendedKitchen,
    ] = await Promise.all([
      // Waiter counts
      this.prisma.user.count({ where: { ...baseWhere, role: 'waiter' } }),
      this.prisma.user.count({
        where: { ...baseWhere, role: 'waiter', status: 'active' },
      }),
      this.prisma.user.count({
        where: { ...baseWhere, role: 'waiter', status: 'inactive' },
      }),
      this.prisma.user.count({
        where: { ...baseWhere, role: 'waiter', status: 'suspended' },
      }),
      // Kitchen staff counts
      this.prisma.user.count({ where: { ...baseWhere, role: 'kitchen_staff' } }),
      this.prisma.user.count({
        where: { ...baseWhere, role: 'kitchen_staff', status: 'active' },
      }),
      this.prisma.user.count({
        where: { ...baseWhere, role: 'kitchen_staff', status: 'inactive' },
      }),
      this.prisma.user.count({
        where: { ...baseWhere, role: 'kitchen_staff', status: 'suspended' },
      }),
    ]);

    return {
      total: totalWaiter + totalKitchen,
      byRole: {
        waiter: {
          total: totalWaiter,
          active: activeWaiter,
          inactive: inactiveWaiter,
          suspended: suspendedWaiter,
        },
        kitchen_staff: {
          total: totalKitchen,
          active: activeKitchen,
          inactive: inactiveKitchen,
          suspended: suspendedKitchen,
        },
      },
      summary: {
        active: activeWaiter + activeKitchen,
        inactive: inactiveWaiter + inactiveKitchen,
        suspended: suspendedWaiter + suspendedKitchen,
      },
    };
  }

  /**
   * Get a single staff member by ID
   */
  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: { in: STAFF_ROLES },
      },
    });

    if (!user) {
      throw new NotFoundException(t('staff.staffNotFound', 'Staff not found'));
    }

    return this.formatStaffResponse(user);
  }

  /**
   * Create/invite a new staff member
   */
  async create(tenantId: string, createStaffDto: CreateStaffDto) {
    // Check for duplicate email (globally unique)
    const existing = await this.prisma.user.findUnique({
      where: { email: createStaffDto.email },
    });

    if (existing) {
      throw new ConflictException(
        t('staff.emailExists', 'Email already exists'),
      );
    }

    // Create the staff user
    const user = await this.prisma.user.create({
      data: {
        email: createStaffDto.email,
        fullName: createStaffDto.fullName,
        phone: createStaffDto.phone,
        role: createStaffDto.role,
        tenantId,
        emailVerified: false,
        status: 'active',
      },
    });

    // Create verification token and send invite email
    const verificationToken = await this.tokenService.createVerificationToken(
      user.id,
      'email_verification',
    );

    await this.emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.fullName,
    );

    this.logger.log(
      `Staff created: ${user.id} (${user.email}) role=${user.role} for tenant ${tenantId}`,
    );

    return this.formatStaffResponse(user);
  }

  /**
   * Update a staff member
   */
  async update(tenantId: string, id: string, updateStaffDto: UpdateStaffDto) {
    // Check if staff exists
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: { in: STAFF_ROLES },
      },
    });

    if (!existing) {
      throw new NotFoundException(t('staff.staffNotFound', 'Staff not found'));
    }

    // Update the staff
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: updateStaffDto.fullName,
        phone: updateStaffDto.phone,
        status: updateStaffDto.status,
      },
    });

    this.logger.log(`Staff updated: ${user.id} (${user.email})`);

    return this.formatStaffResponse(user);
  }

  /**
   * Update staff status only
   */
  async updateStatus(
    tenantId: string,
    id: string,
    updateStatusDto: UpdateStatusDto,
  ) {
    // Check if staff exists
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: { in: STAFF_ROLES },
      },
    });

    if (!existing) {
      throw new NotFoundException(t('staff.staffNotFound', 'Staff not found'));
    }

    // Update status
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: updateStatusDto.status },
    });

    this.logger.log(
      `Staff status updated: ${user.id} (${user.email}) to ${updateStatusDto.status}`,
    );

    return {
      id: user.id,
      status: user.status,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Delete a staff member
   */
  async remove(tenantId: string, id: string) {
    // Check if staff exists
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: { in: STAFF_ROLES },
      },
    });

    if (!existing) {
      throw new NotFoundException(t('staff.staffNotFound', 'Staff not found'));
    }

    // Check for active orders (as waiter)
    const activeOrdersCount = await this.prisma.order.count({
      where: {
        waiterId: id,
        status: { in: ['pending', 'confirmed', 'preparing', 'ready'] },
      },
    });

    if (activeOrdersCount > 0) {
      throw new ConflictException(
        t(
          'staff.hasActiveOrders',
          'Cannot delete staff with active orders',
        ),
      );
    }

    await this.prisma.user.delete({
      where: { id },
    });

    this.logger.log(`Staff deleted: ${id} (${existing.email})`);

    return {
      message: t('staff.staffDeleted', 'Staff deleted successfully'),
    };
  }

  /**
   * Send password reset email for a staff member
   */
  async resetPassword(tenantId: string, id: string) {
    // Check if staff exists
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: { in: STAFF_ROLES },
      },
    });

    if (!existing) {
      throw new NotFoundException(t('staff.staffNotFound', 'Staff not found'));
    }

    // Create password reset token and send email
    const resetToken = await this.tokenService.createVerificationToken(
      existing.id,
      'password_reset',
    );

    await this.emailService.sendPasswordResetEmail(
      existing.email,
      resetToken,
      existing.fullName,
    );

    this.logger.log(`Password reset email sent for staff: ${id} (${existing.email})`);

    return {
      message: t(
        'staff.passwordResetSent',
        'Password reset email sent successfully',
      ),
    };
  }

  /**
   * Resend invite email for a staff member who hasn't verified
   */
  async resendInvite(tenantId: string, id: string) {
    // Check if staff exists and is not verified
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: { in: STAFF_ROLES },
      },
    });

    if (!existing) {
      throw new NotFoundException(t('staff.staffNotFound', 'Staff not found'));
    }

    if (existing.emailVerified) {
      throw new ConflictException(
        t('staff.alreadyVerified', 'Staff member has already verified their email'),
      );
    }

    // Invalidate old verification tokens
    await this.prisma.userVerificationToken.updateMany({
      where: {
        userId: existing.id,
        type: 'email_verification',
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // Create new verification token and send email
    const verificationToken = await this.tokenService.createVerificationToken(
      existing.id,
      'email_verification',
    );

    await this.emailService.sendVerificationEmail(
      existing.email,
      verificationToken,
      existing.fullName,
    );

    this.logger.log(`Invite email resent for staff: ${id} (${existing.email})`);

    return {
      message: t('staff.inviteResent', 'Invite email resent successfully'),
    };
  }
}
