import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { t } from '../../common/utils';
import {
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  QueryModifierGroupsDto,
  ReorderModifierGroupsDto,
  CreateModifierDto,
  UpdateModifierDto,
  ReorderModifiersDto,
} from './dto';

@Injectable()
export class ModifiersService {
  private readonly logger = new Logger(ModifiersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // MODIFIER GROUPS
  // ============================================

  /**
   * Get paginated list of modifier groups
   */
  async findAllGroups(tenantId: string, query: QueryModifierGroupsDto) {
    const {
      page = 1,
      limit = 50,
      search,
      sort_by = 'display_order',
      sort_order = 'asc',
      include_usage_count = true,
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      tenantId: string;
      name?: { contains: string; mode: 'insensitive' };
    } = { tenantId };

    // Search filter
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    // Map API field names to Prisma field names
    const fieldMapping: { [key: string]: string } = {
      name: 'name',
      display_order: 'displayOrder',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
    };

    const prismaSortBy = fieldMapping[sort_by] || sort_by;

    // Get total count
    const total = await this.prisma.modifierGroup.count({ where });

    // Get modifier groups
    const modifierGroups = await this.prisma.modifierGroup.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [prismaSortBy]: sort_order },
      include: include_usage_count
        ? {
            _count: {
              select: {
                menuItems: true,
              },
            },
          }
        : undefined,
    });

    // Format response
    const formattedGroups = modifierGroups.map((group) => {
      const count =
        '_count' in group ? (group._count as { menuItems: number }) : null;
      return {
        id: group.id,
        tenant_id: group.tenantId,
        name: group.name,
        type: group.type,
        is_required: group.isRequired,
        min_selections: group.minSelections,
        max_selections: group.maxSelections,
        display_order: group.displayOrder,
        used_by_count:
          include_usage_count && count ? count.menuItems : undefined,
        created_at: group.createdAt,
        updated_at: group.updatedAt,
      };
    });

    return {
      success: true,
      data: {
        modifier_groups: formattedGroups,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
          has_next: page < Math.ceil(total / limit),
          has_prev: page > 1,
        },
      },
    };
  }

  /**
   * Get modifier group by ID
   */
  async findOneGroup(
    tenantId: string,
    groupId: string,
    includeModifiers = true,
  ) {
    const modifierGroup = await this.prisma.modifierGroup.findUnique({
      where: { id: groupId, tenantId },
      include: {
        modifiers: includeModifiers
          ? {
              orderBy: { displayOrder: 'asc' },
            }
          : false,
        _count: {
          select: {
            menuItems: true,
          },
        },
      },
    });

    if (!modifierGroup) {
      throw new NotFoundException(
        t('modifiers.modifierGroupNotFound', 'Modifier group not found'),
      );
    }

    return {
      success: true,
      data: {
        modifier_group: {
          id: modifierGroup.id,
          tenant_id: modifierGroup.tenantId,
          name: modifierGroup.name,
          type: modifierGroup.type,
          is_required: modifierGroup.isRequired,
          min_selections: modifierGroup.minSelections,
          max_selections: modifierGroup.maxSelections,
          display_order: modifierGroup.displayOrder,
          used_by_count: modifierGroup._count.menuItems,
          modifiers: includeModifiers
            ? modifierGroup.modifiers.map((modifier) => ({
                id: modifier.id,
                modifier_group_id: modifier.modifierGroupId,
                name: modifier.name,
                price_adjustment: modifier.priceAdjustment,
                is_available: modifier.isAvailable,
                display_order: modifier.displayOrder,
                created_at: modifier.createdAt,
                updated_at: modifier.updatedAt,
              }))
            : undefined,
          created_at: modifierGroup.createdAt,
          updated_at: modifierGroup.updatedAt,
        },
      },
    };
  }

  /**
   * Create a new modifier group
   */
  async createGroup(tenantId: string, createDto: CreateModifierGroupDto) {
    // Check if modifier group name already exists for this tenant
    const existingGroup = await this.prisma.modifierGroup.findFirst({
      where: {
        tenantId,
        name: createDto.name,
      },
    });

    if (existingGroup) {
      throw new ConflictException(
        t(
          'modifiers.modifierGroupNameExists',
          'A modifier group with this name already exists',
        ),
      );
    }

    // Validate min/max selections
    if (
      createDto.min_selections !== undefined &&
      createDto.max_selections !== null &&
      createDto.max_selections !== undefined &&
      createDto.min_selections > createDto.max_selections
    ) {
      throw new BadRequestException(
        t(
          'modifiers.invalidSelectionConstraints',
          'Invalid selection constraints (min > max or min < 0 or max < 0)',
        ),
      );
    }

    // If display_order not provided, assign the next order
    let displayOrder = createDto.display_order;
    if (displayOrder === undefined) {
      const maxOrder = await this.prisma.modifierGroup.findFirst({
        where: { tenantId },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });
      displayOrder = (maxOrder?.displayOrder || 0) + 1;
    }

    const modifierGroup = await this.prisma.modifierGroup.create({
      data: {
        tenantId,
        name: createDto.name,
        type: createDto.type,
        isRequired: createDto.is_required,
        minSelections: createDto.min_selections ?? 0,
        maxSelections: createDto.max_selections,
        displayOrder,
      },
      include: {
        _count: {
          select: {
            menuItems: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        modifier_group: {
          id: modifierGroup.id,
          tenant_id: modifierGroup.tenantId,
          name: modifierGroup.name,
          type: modifierGroup.type,
          is_required: modifierGroup.isRequired,
          min_selections: modifierGroup.minSelections,
          max_selections: modifierGroup.maxSelections,
          display_order: modifierGroup.displayOrder,
          used_by_count: modifierGroup._count.menuItems,
          modifiers: [],
          created_at: modifierGroup.createdAt,
          updated_at: modifierGroup.updatedAt,
        },
      },
    };
  }

  /**
   * Update a modifier group
   */
  async updateGroup(
    tenantId: string,
    groupId: string,
    updateDto: UpdateModifierGroupDto,
  ) {
    // Check if modifier group exists
    const existingGroup = await this.prisma.modifierGroup.findUnique({
      where: { id: groupId, tenantId },
    });

    if (!existingGroup) {
      throw new NotFoundException(
        t('modifiers.modifierGroupNotFound', 'Modifier group not found'),
      );
    }

    // Check for name conflict if name is being updated
    if (updateDto.name && updateDto.name !== existingGroup.name) {
      const duplicateGroup = await this.prisma.modifierGroup.findFirst({
        where: {
          tenantId,
          name: updateDto.name,
          id: { not: groupId },
        },
      });

      if (duplicateGroup) {
        throw new ConflictException(
          t(
            'modifiers.modifierGroupNameExists',
            'A modifier group with this name already exists',
          ),
        );
      }
    }

    // Validate min/max selections
    const minSelections =
      updateDto.min_selections ?? existingGroup.minSelections;
    const maxSelections =
      updateDto.max_selections !== undefined
        ? updateDto.max_selections
        : existingGroup.maxSelections;

    if (maxSelections !== null && minSelections > maxSelections) {
      throw new BadRequestException(
        t(
          'modifiers.invalidSelectionConstraints',
          'Invalid selection constraints (min > max or min < 0 or max < 0)',
        ),
      );
    }

    const modifierGroup = await this.prisma.modifierGroup.update({
      where: { id: groupId, tenantId },
      data: {
        name: updateDto.name,
        type: updateDto.type,
        isRequired: updateDto.is_required,
        minSelections: updateDto.min_selections,
        maxSelections: updateDto.max_selections,
        displayOrder: updateDto.display_order,
      },
      include: {
        _count: {
          select: {
            menuItems: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        modifier_group: {
          id: modifierGroup.id,
          tenant_id: modifierGroup.tenantId,
          name: modifierGroup.name,
          type: modifierGroup.type,
          is_required: modifierGroup.isRequired,
          min_selections: modifierGroup.minSelections,
          max_selections: modifierGroup.maxSelections,
          display_order: modifierGroup.displayOrder,
          used_by_count: modifierGroup._count.menuItems,
          created_at: modifierGroup.createdAt,
          updated_at: modifierGroup.updatedAt,
        },
      },
    };
  }

  /**
   * Reorder modifier groups
   */
  async reorderGroups(tenantId: string, reorderDto: ReorderModifierGroupsDto) {
    const { modifier_groups } = reorderDto;

    // Validate all groups belong to tenant
    const groupIds = modifier_groups.map((g) => g.id);
    const existingGroups = await this.prisma.modifierGroup.findMany({
      where: {
        id: { in: groupIds },
        tenantId,
      },
    });

    if (existingGroups.length !== groupIds.length) {
      throw new BadRequestException(
        t(
          'modifiers.modifierGroupsNotFoundOrInvalid',
          'One or more modifier groups not found or do not belong to this tenant',
        ),
      );
    }

    // Check for duplicate display orders
    const displayOrders = modifier_groups.map((g) => g.display_order);
    const uniqueOrders = new Set(displayOrders);
    if (uniqueOrders.size !== displayOrders.length) {
      throw new BadRequestException(
        t(
          'modifiers.displayOrdersMustBeUnique',
          'Display orders must be unique',
        ),
      );
    }

    // Update display orders
    await this.prisma.$transaction(
      modifier_groups.map((group) =>
        this.prisma.modifierGroup.update({
          where: { id: group.id },
          data: { displayOrder: group.display_order },
        }),
      ),
    );

    return {
      success: true,
      data: {
        message: t(
          'modifiers.modifierGroupsReorderedSuccess',
          'Modifier groups reordered successfully',
        ),
        updated_count: modifier_groups.length,
      },
    };
  }

  /**
   * Delete a modifier group
   */
  async removeGroup(tenantId: string, groupId: string, force = false) {
    const modifierGroup = await this.prisma.modifierGroup.findUnique({
      where: { id: groupId, tenantId },
      include: {
        _count: {
          select: {
            menuItems: true,
          },
        },
      },
    });

    if (!modifierGroup) {
      throw new NotFoundException(
        t('modifiers.modifierGroupNotFound', 'Modifier group not found'),
      );
    }

    // Check if group is used by menu items
    if (modifierGroup._count.menuItems > 0 && !force) {
      throw new ConflictException(
        t(
          'modifiers.cannotDeleteModifierGroupWithMenuItems',
          'Cannot delete modifier group used by menu items',
        ),
      );
    }

    await this.prisma.modifierGroup.delete({
      where: { id: groupId, tenantId },
    });

    return {
      success: true,
      data: {
        message: t(
          'modifiers.modifierGroupDeletedSuccess',
          'Modifier group deleted successfully',
        ),
        deleted_at: new Date().toISOString(),
      },
    };
  }

  // ============================================
  // MODIFIERS
  // ============================================

  /**
   * Get all modifiers for a modifier group
   */
  async findAllModifiers(
    tenantId: string,
    groupId: string,
    includeUnavailable = true,
    sortBy = 'display_order',
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    // Verify the modifier group exists and belongs to tenant
    const modifierGroup = await this.prisma.modifierGroup.findUnique({
      where: { id: groupId, tenantId },
    });

    if (!modifierGroup) {
      throw new NotFoundException(
        t('modifiers.modifierGroupNotFound', 'Modifier group not found'),
      );
    }

    // Build where clause
    const where: {
      modifierGroupId: string;
      isAvailable?: boolean;
    } = { modifierGroupId: groupId };

    if (!includeUnavailable) {
      where.isAvailable = true;
    }

    // Map API field names to Prisma field names
    const fieldMapping: { [key: string]: string } = {
      name: 'name',
      display_order: 'displayOrder',
      price_adjustment: 'priceAdjustment',
      created_at: 'createdAt',
    };

    const prismaSortBy = fieldMapping[sortBy] || sortBy;

    const modifiers = await this.prisma.modifier.findMany({
      where,
      orderBy: { [prismaSortBy]: sortOrder },
    });

    return {
      success: true,
      data: {
        modifiers: modifiers.map((modifier) => ({
          id: modifier.id,
          modifier_group_id: modifier.modifierGroupId,
          name: modifier.name,
          price_adjustment: modifier.priceAdjustment,
          is_available: modifier.isAvailable,
          display_order: modifier.displayOrder,
          created_at: modifier.createdAt,
          updated_at: modifier.updatedAt,
        })),
      },
    };
  }

  /**
   * Create a new modifier
   */
  async createModifier(
    tenantId: string,
    groupId: string,
    createDto: CreateModifierDto,
  ) {
    // Verify the modifier group exists and belongs to tenant
    const modifierGroup = await this.prisma.modifierGroup.findUnique({
      where: { id: groupId, tenantId },
    });

    if (!modifierGroup) {
      throw new NotFoundException(
        t('modifiers.modifierGroupNotFound', 'Modifier group not found'),
      );
    }

    // Check if modifier name already exists in this group
    const existingModifier = await this.prisma.modifier.findFirst({
      where: {
        modifierGroupId: groupId,
        name: createDto.name,
      },
    });

    if (existingModifier) {
      throw new ConflictException(
        t(
          'modifiers.modifierNameExists',
          'A modifier with this name already exists in this group',
        ),
      );
    }

    // If display_order not provided, assign the next order
    let displayOrder = createDto.display_order;
    if (displayOrder === undefined) {
      const maxOrder = await this.prisma.modifier.findFirst({
        where: { modifierGroupId: groupId },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });
      displayOrder = (maxOrder?.displayOrder || 0) + 1;
    }

    const modifier = await this.prisma.modifier.create({
      data: {
        modifierGroupId: groupId,
        name: createDto.name,
        priceAdjustment: createDto.price_adjustment,
        isAvailable: createDto.is_available,
        displayOrder,
      },
    });

    return {
      success: true,
      data: {
        modifier: {
          id: modifier.id,
          modifier_group_id: modifier.modifierGroupId,
          name: modifier.name,
          price_adjustment: modifier.priceAdjustment,
          is_available: modifier.isAvailable,
          display_order: modifier.displayOrder,
          created_at: modifier.createdAt,
          updated_at: modifier.updatedAt,
        },
      },
    };
  }

  /**
   * Update a modifier
   */
  async updateModifier(
    tenantId: string,
    modifierId: string,
    updateDto: UpdateModifierDto,
  ) {
    // Get the modifier and verify it belongs to tenant
    const existingModifier = await this.prisma.modifier.findUnique({
      where: { id: modifierId },
      include: {
        modifierGroup: {
          select: {
            tenantId: true,
          },
        },
      },
    });

    if (
      !existingModifier ||
      existingModifier.modifierGroup.tenantId !== tenantId
    ) {
      throw new NotFoundException(
        t('modifiers.modifierNotFound', 'Modifier not found'),
      );
    }

    // Check for name conflict if name is being updated
    if (updateDto.name && updateDto.name !== existingModifier.name) {
      const duplicateModifier = await this.prisma.modifier.findFirst({
        where: {
          modifierGroupId: existingModifier.modifierGroupId,
          name: updateDto.name,
          id: { not: modifierId },
        },
      });

      if (duplicateModifier) {
        throw new ConflictException(
          t(
            'modifiers.modifierNameExists',
            'A modifier with this name already exists in this group',
          ),
        );
      }
    }

    const modifier = await this.prisma.modifier.update({
      where: { id: modifierId },
      data: {
        name: updateDto.name,
        priceAdjustment: updateDto.price_adjustment,
        isAvailable: updateDto.is_available,
        displayOrder: updateDto.display_order,
      },
    });

    return {
      success: true,
      data: {
        modifier: {
          id: modifier.id,
          modifier_group_id: modifier.modifierGroupId,
          name: modifier.name,
          price_adjustment: modifier.priceAdjustment,
          is_available: modifier.isAvailable,
          display_order: modifier.displayOrder,
          created_at: modifier.createdAt,
          updated_at: modifier.updatedAt,
        },
      },
    };
  }

  /**
   * Reorder modifiers within a group
   */
  async reorderModifiers(
    tenantId: string,
    groupId: string,
    reorderDto: ReorderModifiersDto,
  ) {
    // Verify the modifier group exists and belongs to tenant
    const modifierGroup = await this.prisma.modifierGroup.findUnique({
      where: { id: groupId, tenantId },
    });

    if (!modifierGroup) {
      throw new NotFoundException(
        t('modifiers.modifierGroupNotFound', 'Modifier group not found'),
      );
    }

    const { modifiers } = reorderDto;

    // Validate all modifiers belong to this group
    const modifierIds = modifiers.map((m) => m.id);
    const existingModifiers = await this.prisma.modifier.findMany({
      where: {
        id: { in: modifierIds },
        modifierGroupId: groupId,
      },
    });

    if (existingModifiers.length !== modifierIds.length) {
      throw new BadRequestException(
        t(
          'modifiers.modifiersNotFoundOrInvalid',
          'One or more modifiers not found or do not belong to this group',
        ),
      );
    }

    // Check for duplicate display orders
    const displayOrders = modifiers.map((m) => m.display_order);
    const uniqueOrders = new Set(displayOrders);
    if (uniqueOrders.size !== displayOrders.length) {
      throw new BadRequestException(
        t(
          'modifiers.displayOrdersMustBeUnique',
          'Display orders must be unique',
        ),
      );
    }

    // Update display orders
    await this.prisma.$transaction(
      modifiers.map((modifier) =>
        this.prisma.modifier.update({
          where: { id: modifier.id },
          data: { displayOrder: modifier.display_order },
        }),
      ),
    );

    return {
      success: true,
      data: {
        message: t(
          'modifiers.modifiersReorderedSuccess',
          'Modifiers reordered successfully',
        ),
        updated_count: modifiers.length,
      },
    };
  }

  /**
   * Delete a modifier
   */
  async removeModifier(tenantId: string, modifierId: string) {
    // Get the modifier and verify it belongs to tenant
    const modifier = await this.prisma.modifier.findUnique({
      where: { id: modifierId },
      include: {
        modifierGroup: {
          select: {
            tenantId: true,
          },
        },
      },
    });

    if (!modifier || modifier.modifierGroup.tenantId !== tenantId) {
      throw new NotFoundException(
        t('modifiers.modifierNotFound', 'Modifier not found'),
      );
    }

    await this.prisma.modifier.delete({
      where: { id: modifierId },
    });

    return {
      success: true,
      data: {
        message: t(
          'modifiers.modifierDeletedSuccess',
          'Modifier deleted successfully',
        ),
      },
    };
  }
}
