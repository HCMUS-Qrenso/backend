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
  CreateCategoryDto,
  UpdateCategoryDto,
  QueryCategoriesDto,
  UpdateCategoryStatusDto,
  ReorderCategoriesDto,
} from './dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get category statistics
   */
  async getStats(tenantId: string) {
    // Get category stats grouped by isActive status
    const categoryStats = await this.prisma.category.groupBy({
      by: ['isActive'],
      where: { tenantId },
      _count: {
        id: true,
      },
    });

    // Get total menu items count
    const totalMenuItems = await this.prisma.menuItem.count({
      where: { tenantId },
    });

    // Process category stats
    const totalCategories = categoryStats.reduce(
      (sum, stat) => sum + stat._count.id,
      0,
    );
    const activeCategories =
      categoryStats.find((stat) => stat.isActive)?._count.id || 0;
    const hiddenCategories = totalCategories - activeCategories;

    return {
      success: true,
      data: {
        total_categories: totalCategories,
        active_categories: activeCategories,
        hidden_categories: hiddenCategories,
        total_menu_items: totalMenuItems,
      },
    };
  }

  /**
   * Get paginated list of categories
   */
  async findAll(tenantId: string, query: QueryCategoriesDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sort_by = 'display_order',
      sort_order = 'asc',
      include_item_count = true,
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      tenantId: string;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        description?: { contains: string; mode: 'insensitive' };
      }>;
      isActive?: boolean;
    } = { tenantId };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
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
    const total = await this.prisma.category.count({ where });

    // Get categories
    const categories = await this.prisma.category.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [prismaSortBy]: sort_order },
      include: include_item_count
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
    const formattedCategories = categories.map((category) => {
      const count =
        '_count' in category
          ? (category._count as { menuItems: number })
          : null;
      return {
        id: category.id,
        tenant_id: category.tenantId,
        name: category.name,
        description: category.description,
        display_order: category.displayOrder,
        is_active: category.isActive,
        item_count: include_item_count && count ? count.menuItems : undefined,
        created_at: category.createdAt,
        updated_at: category.updatedAt,
      };
    });

    return {
      success: true,
      data: {
        categories: formattedCategories,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
          has_next: page < Math.ceil(total / limit),
          has_prev: page > 1,
        },
        filters: {
          search: search || null,
          status,
          sort_by,
          sort_order,
        },
      },
    };
  }

  /**
   * Get category by ID
   */
  async findOne(
    tenantId: string,
    id: string,
    includeMenuItems = false,
    includeItemCount = true,
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id, tenantId },
      include: {
        menuItems: includeMenuItems
          ? {
              select: {
                id: true,
                name: true,
                basePrice: true,
                status: true,
                isChefRecommendation: true,
              },
            }
          : false,
        _count: includeItemCount
          ? {
              select: {
                menuItems: true,
              },
            }
          : undefined,
      },
    });

    if (!category) {
      throw new NotFoundException(
        t('categories.categoryNotFound', 'Category not found'),
      );
    }

    return {
      success: true,
      data: {
        category: {
          id: category.id,
          tenant_id: category.tenantId,
          name: category.name,
          description: category.description,
          display_order: category.displayOrder,
          is_active: category.isActive,
          item_count: includeItemCount ? category._count?.menuItems : undefined,
          menu_items: includeMenuItems
            ? category.menuItems.map((item) => ({
                id: item.id,
                name: item.name,
                base_price: Number(item.basePrice),
                status: item.status,
                is_chef_recommendation: item.isChefRecommendation,
              }))
            : null,
          created_at: category.createdAt,
          updated_at: category.updatedAt,
        },
      },
    };
  }

  /**
   * Create a new category
   */
  async create(tenantId: string, createCategoryDto: CreateCategoryDto) {
    // Check if category name already exists for this tenant
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        tenantId,
        name: createCategoryDto.name,
      },
    });

    if (existingCategory) {
      throw new ConflictException(
        t(
          'categories.categoryNameExists',
          'A category with this name already exists',
        ),
      );
    }

    // If display_order not provided, assign the next order
    let displayOrder = createCategoryDto.display_order;
    if (displayOrder === undefined) {
      const maxOrder = await this.prisma.category.findFirst({
        where: { tenantId },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });
      displayOrder = (maxOrder?.displayOrder || 0) + 1;
    }

    const category = await this.prisma.category.create({
      data: {
        tenantId,
        name: createCategoryDto.name,
        description: createCategoryDto.description,
        displayOrder,
        isActive: createCategoryDto.is_active ?? true,
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
        category: {
          id: category.id,
          tenant_id: category.tenantId,
          name: category.name,
          description: category.description,
          display_order: category.displayOrder,
          is_active: category.isActive,
          item_count: category._count.menuItems,
          created_at: category.createdAt,
          updated_at: category.updatedAt,
        },
      },
    };
  }

  /**
   * Update a category
   */
  async update(
    tenantId: string,
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ) {
    // Check if category exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { id, tenantId },
    });

    if (!existingCategory) {
      throw new NotFoundException(
        t('categories.categoryNotFound', 'Category not found'),
      );
    }

    // Check for name conflict if name is being updated
    if (
      updateCategoryDto.name &&
      updateCategoryDto.name !== existingCategory.name
    ) {
      const duplicateCategory = await this.prisma.category.findFirst({
        where: {
          tenantId,
          name: updateCategoryDto.name,
          id: { not: id },
        },
      });

      if (duplicateCategory) {
        throw new ConflictException(
          t(
            'categories.categoryNameExists',
            'A category with this name already exists',
          ),
        );
      }
    }

    const category = await this.prisma.category.update({
      where: { id, tenantId },
      data: {
        name: updateCategoryDto.name,
        description: updateCategoryDto.description,
        displayOrder: updateCategoryDto.display_order,
        isActive: updateCategoryDto.is_active,
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
        category: {
          id: category.id,
          tenant_id: category.tenantId,
          name: category.name,
          description: category.description,
          display_order: category.displayOrder,
          is_active: category.isActive,
          item_count: category._count.menuItems,
          created_at: category.createdAt,
          updated_at: category.updatedAt,
        },
      },
    };
  }

  /**
   * Update category status (toggle visibility)
   */
  async updateStatus(
    tenantId: string,
    id: string,
    updateStatusDto: UpdateCategoryStatusDto,
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id, tenantId },
    });

    if (!category) {
      throw new NotFoundException(
        t('categories.categoryNotFound', 'Category not found'),
      );
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id, tenantId },
      data: {
        isActive: updateStatusDto.is_active,
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
        category: {
          id: updatedCategory.id,
          tenant_id: updatedCategory.tenantId,
          name: updatedCategory.name,
          description: updatedCategory.description,
          display_order: updatedCategory.displayOrder,
          is_active: updatedCategory.isActive,
          item_count: updatedCategory._count.menuItems,
          created_at: updatedCategory.createdAt,
          updated_at: updatedCategory.updatedAt,
        },
      },
    };
  }

  /**
   * Reorder categories
   */
  async reorder(tenantId: string, reorderDto: ReorderCategoriesDto) {
    const { categories } = reorderDto;

    // Validate all categories belong to tenant
    const categoryIds = categories.map((c) => c.id);
    const existingCategories = await this.prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        tenantId,
      },
    });

    if (existingCategories.length !== categoryIds.length) {
      throw new BadRequestException(
        t(
          'categories.categoriesNotFoundOrInvalid',
          'One or more categories not found or do not belong to this tenant',
        ),
      );
    }

    // Check for duplicate display orders
    const displayOrders = categories.map((c) => c.display_order);
    const uniqueOrders = new Set(displayOrders);
    if (uniqueOrders.size !== displayOrders.length) {
      throw new BadRequestException(
        t(
          'categories.displayOrdersMustBeUnique',
          'Display orders must be unique',
        ),
      );
    }

    // Update display orders
    await this.prisma.$transaction(
      categories.map((category) =>
        this.prisma.category.update({
          where: { id: category.id },
          data: { displayOrder: category.display_order },
        }),
      ),
    );

    return {
      success: true,
      data: {
        message: t(
          'categories.categoryOrderUpdatedSuccess',
          'Category order updated successfully',
        ),
        updated_count: categories.length,
      },
    };
  }

  /**
   * Delete a category (soft delete by default)
   */
  async remove(tenantId: string, id: string, force = false) {
    const category = await this.prisma.category.findUnique({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            menuItems: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(
        t('categories.categoryNotFound', 'Category not found'),
      );
    }

    // Check if category has associated menu items
    if (category._count.menuItems > 0 && !force) {
      throw new ConflictException(
        t(
          'categories.cannotDeleteCategoryWithMenuItems',
          'Cannot delete category with associated menu items',
        ),
      );
    }

    // For now, we'll do a hard delete since the schema doesn't have deletedAt
    // In production, you would add a deletedAt field for soft deletes
    await this.prisma.category.delete({
      where: { id, tenantId },
    });

    return {
      success: true,
      data: {
        message: t(
          'categories.categoryDeletedSuccess',
          'Category deleted successfully',
        ),
        deleted_at: new Date().toISOString(),
      },
    };
  }
}
