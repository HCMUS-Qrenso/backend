import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { t } from '../../common/utils';
import { CreateMenuItemDto, UpdateMenuItemDto, QueryMenuItemsDto } from './dto';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated list of menu items with filtering
   */
  async findAll(tenantId: string, query: QueryMenuItemsDto) {
    const {
      page = 1,
      limit = 10,
      search,
      category_id,
      status,
      is_chef_recommendation,
      sort_by = 'createdAt',
      sort_order = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenantId,
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (category_id) {
      where.categoryId = category_id;
    }

    if (status) {
      where.status = status;
    }

    if (is_chef_recommendation !== undefined) {
      where.isChefRecommendation = is_chef_recommendation;
    }

    // Map API field names to Prisma field names
    const fieldMapping: { [key: string]: string } = {
      created_at: 'createdAt',
      name: 'name',
      base_price: 'basePrice',
      popularity_score: 'popularityScore',
    };

    const prismaSortBy = fieldMapping[sort_by] || sort_by;

    // Get total count
    const total = await this.prisma.menuItem.count({ where });

    // Get menu items with category
    const menuItems = await this.prisma.menuItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [prismaSortBy]: sort_order },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          select: {
            id: true,
            imageUrl: true,
            displayOrder: true,
          },
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: {
            reviews: true,
            orderItems: true,
          },
        },
      },
    });

    // Format response
    const formattedMenuItems = menuItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      base_price: item.basePrice,
      preparation_time: item.preparationTime,
      status: item.status,
      is_chef_recommendation: item.isChefRecommendation,
      allergen_info: item.allergenInfo,
      nutritional_info: item.nutritionalInfo,
      popularity_score: item.popularityScore,
      category: item.category
        ? {
            id: item.category.id,
            name: item.category.name,
          }
        : null,
      images: item.images.map((img) => ({
        id: img.id,
        image_url: img.imageUrl,
        display_order: img.displayOrder,
      })),
      review_count: item._count.reviews,
      order_count: item._count.orderItems,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    }));

    return {
      success: true,
      data: {
        menu_items: formattedMenuItems,
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
   * Get menu item by ID
   */
  async findOne(tenantId: string, id: string) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id, tenantId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          select: {
            id: true,
            imageUrl: true,
            displayOrder: true,
          },
          orderBy: { displayOrder: 'asc' },
        },
        modifierGroups: {
          include: {
            modifierGroup: {
              select: {
                id: true,
                name: true,
                type: true,
                isRequired: true,
                minSelections: true,
                maxSelections: true,
                displayOrder: true,
                modifiers: {
                  select: {
                    id: true,
                    name: true,
                    priceAdjustment: true,
                    isAvailable: true,
                    displayOrder: true,
                  },
                  orderBy: { displayOrder: 'asc' },
                },
              },
            },
          },
          orderBy: { modifierGroup: { displayOrder: 'asc' } },
        },
        pairings: {
          include: {
            relatedItem: {
              select: {
                id: true,
                name: true,
                basePrice: true,
              },
            },
          },
        },
        _count: {
          select: {
            reviews: true,
            orderItems: true,
          },
        },
      },
    });

    if (!menuItem) {
      throw new NotFoundException(
        t('menu.menuItemNotFound', 'Menu item not found'),
      );
    }

    return {
      success: true,
      data: {
        id: menuItem.id,
        name: menuItem.name,
        description: menuItem.description,
        base_price: menuItem.basePrice,
        preparation_time: menuItem.preparationTime,
        status: menuItem.status,
        is_chef_recommendation: menuItem.isChefRecommendation,
        allergen_info: menuItem.allergenInfo,
        nutritional_info: menuItem.nutritionalInfo,
        popularity_score: menuItem.popularityScore,
        category: menuItem.category
          ? {
              id: menuItem.category.id,
              name: menuItem.category.name,
            }
          : null,
        images: menuItem.images.map((img) => ({
          id: img.id,
          image_url: img.imageUrl,
          display_order: img.displayOrder,
        })),
        modifier_groups: menuItem.modifierGroups.map((mg) => ({
          id: mg.modifierGroup.id,
          name: mg.modifierGroup.name,
          type: mg.modifierGroup.type,
          is_required: mg.modifierGroup.isRequired,
          min_selections: mg.modifierGroup.minSelections,
          max_selections: mg.modifierGroup.maxSelections,
          display_order: mg.modifierGroup.displayOrder,
          modifiers: mg.modifierGroup.modifiers.map((mod) => ({
            id: mod.id,
            name: mod.name,
            price_adjustment: mod.priceAdjustment,
            is_available: mod.isAvailable,
            display_order: mod.displayOrder,
          })),
        })),
        pairings: menuItem.pairings.map((p) => ({
          id: p.relatedItem.id,
          name: p.relatedItem.name,
          base_price: p.relatedItem.basePrice,
        })),
        review_count: menuItem._count.reviews,
        order_count: menuItem._count.orderItems,
        created_at: menuItem.createdAt,
        updated_at: menuItem.updatedAt,
      },
    };
  }

  /**
   * Create a new menu item
   */
  async create(tenantId: string, createMenuItemDto: CreateMenuItemDto) {
    // Check if menu item name already exists for this tenant
    const existing = await this.prisma.menuItem.findFirst({
      where: {
        tenantId,
        name: createMenuItemDto.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        t(
          'menu.menuItemNameExists',
          'A menu item with this name already exists',
        ),
      );
    }

    // Create menu item
    const menuItem = await this.prisma.menuItem.create({
      data: {
        tenantId,
        name: createMenuItemDto.name,
        description: createMenuItemDto.description,
        basePrice: createMenuItemDto.base_price,
        preparationTime: createMenuItemDto.preparation_time,
        status: createMenuItemDto.status || 'available',
        isChefRecommendation: createMenuItemDto.is_chef_recommendation || false,
        allergenInfo: createMenuItemDto.allergen_info,
        categoryId: createMenuItemDto.category_id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Add images if provided
    if (
      createMenuItemDto.image_urls &&
      createMenuItemDto.image_urls.length > 0
    ) {
      await this.prisma.menuItemImage.createMany({
        data: createMenuItemDto.image_urls.map((url, index) => ({
          menuItemId: menuItem.id,
          imageUrl: url,
          displayOrder: index,
        })),
      });
    }

    return {
      success: true,
      message: t(
        'menu.menuItemCreatedSuccess',
        'Menu item created successfully',
      ),
      data: {
        id: menuItem.id,
        name: menuItem.name,
        description: menuItem.description,
        base_price: menuItem.basePrice,
        preparation_time: menuItem.preparationTime,
        status: menuItem.status,
        is_chef_recommendation: menuItem.isChefRecommendation,
        allergen_info: menuItem.allergenInfo,
        category: menuItem.category
          ? {
              id: menuItem.category.id,
              name: menuItem.category.name,
            }
          : null,
        created_at: menuItem.createdAt,
        updated_at: menuItem.updatedAt,
      },
    };
  }

  /**
   * Update menu item
   */
  async update(
    tenantId: string,
    id: string,
    updateMenuItemDto: UpdateMenuItemDto,
  ) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id, tenantId },
    });

    if (!menuItem) {
      throw new NotFoundException(
        t('menu.menuItemNotFound', 'Menu item not found'),
      );
    }

    // Check name uniqueness if changing
    if (updateMenuItemDto.name && updateMenuItemDto.name !== menuItem.name) {
      const existing = await this.prisma.menuItem.findFirst({
        where: {
          tenantId,
          name: updateMenuItemDto.name,
        },
      });

      if (existing) {
        throw new ConflictException(
          t(
            'menu.menuItemNameExists',
            'A menu item with this name already exists',
          ),
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (updateMenuItemDto.name !== undefined) {
      updateData.name = updateMenuItemDto.name;
    }
    if (updateMenuItemDto.description !== undefined) {
      updateData.description = updateMenuItemDto.description;
    }
    if (updateMenuItemDto.base_price !== undefined) {
      updateData.basePrice = updateMenuItemDto.base_price;
    }
    if (updateMenuItemDto.preparation_time !== undefined) {
      updateData.preparationTime = updateMenuItemDto.preparation_time;
    }
    if (updateMenuItemDto.status !== undefined) {
      updateData.status = updateMenuItemDto.status;
    }
    if (updateMenuItemDto.is_chef_recommendation !== undefined) {
      updateData.isChefRecommendation =
        updateMenuItemDto.is_chef_recommendation;
    }
    if (updateMenuItemDto.allergen_info !== undefined) {
      updateData.allergenInfo = updateMenuItemDto.allergen_info;
    }
    if (updateMenuItemDto.category_id !== undefined) {
      updateData.categoryId = updateMenuItemDto.category_id;
    }

    const updatedMenuItem = await this.prisma.menuItem.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      message: t(
        'menu.menuItemUpdatedSuccess',
        'Menu item updated successfully',
      ),
      data: {
        id: updatedMenuItem.id,
        name: updatedMenuItem.name,
        description: updatedMenuItem.description,
        base_price: updatedMenuItem.basePrice,
        preparation_time: updatedMenuItem.preparationTime,
        status: updatedMenuItem.status,
        is_chef_recommendation: updatedMenuItem.isChefRecommendation,
        allergen_info: updatedMenuItem.allergenInfo,
        category: updatedMenuItem.category
          ? {
              id: updatedMenuItem.category.id,
              name: updatedMenuItem.category.name,
            }
          : null,
        updated_at: updatedMenuItem.updatedAt,
      },
    };
  }

  /**
   * Delete menu item (soft delete by setting status to unavailable)
   */
  async remove(tenantId: string, id: string) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id, tenantId },
      include: {
        orderItems: {
          where: {
            order: {
              status: {
                notIn: ['completed', 'cancelled', 'abandoned'],
              },
            },
          },
        },
      },
    });

    if (!menuItem) {
      throw new NotFoundException(
        t('menu.menuItemNotFound', 'Menu item not found'),
      );
    }

    // Check if menu item has active orders
    if (menuItem.orderItems.length > 0) {
      throw new ConflictException(
        t(
          'menu.cannotDeleteActiveOrders',
          'Cannot delete menu item with active orders',
        ),
      );
    }

    // Soft delete by setting status to unavailable
    await this.prisma.menuItem.update({
      where: { id },
      data: { status: 'unavailable' },
    });

    return {
      success: true,
      message: t(
        'menu.menuItemDeletedSuccess',
        'Menu item deleted successfully',
      ),
    };
  }

  /**
   * Get menu statistics
   */
  async getStats(tenantId: string) {
    const stats = await this.prisma.menuItem.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });

    const totalMenuItems = stats.reduce((acc, s) => acc + s._count, 0);
    const availableItems =
      stats.find((s) => s.status === 'available')?._count || 0;
    const unavailableItems =
      stats.find((s) => s.status === 'unavailable')?._count || 0;
    const chefRecommendations = await this.prisma.menuItem.count({
      where: {
        tenantId,
        isChefRecommendation: true,
      },
    });

    return {
      success: true,
      data: {
        total_menu_items: totalMenuItems,
        available_items: availableItems,
        unavailable_items: unavailableItems,
        chef_recommendations: chefRecommendations,
      },
    };
  }
}
