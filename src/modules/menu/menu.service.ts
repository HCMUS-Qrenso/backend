import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { t } from '../../common/utils';
import { CreateMenuItemDto, UpdateMenuItemDto, QueryMenuItemsDto, MenuItemStatus } from './dto';
import * as ExcelJS from 'exceljs';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { Express } from 'express';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated list of menu items with filtering
   */
  async findAll(tenantId: string, query: QueryMenuItemsDto, isCustomer: boolean = false) {
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

    if (isCustomer) {
      where.status = { in: [MenuItemStatus.AVAILABLE, MenuItemStatus.SOLD_OUT] };
      where.category = { isActive: true };
    } else if (status) {
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
        modifierGroups: {
          include: {
            modifierGroup: {
              select: {
                id: true,
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
      modifier_groups: item.modifierGroups.map((mg) => ({
        id: mg.modifierGroup.id,
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
        nutritionalInfo: createMenuItemDto.nutritional_info,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        modifierGroups: {
          select: {
            id: true,
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

    // Assign modifier groups if provided
    if (
      createMenuItemDto.modifier_group_ids &&
      createMenuItemDto.modifier_group_ids.length > 0
    ) {
      await this.prisma.menuItemModifierGroup.createMany({
        data: createMenuItemDto.modifier_group_ids.map((modifierGroupId) => ({
          menuItemId: menuItem.id,
          modifierGroupId,
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
        nutritional_info: menuItem.nutritionalInfo,
        modifier_groups: menuItem.modifierGroups,
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
    if (updateMenuItemDto.nutritional_info !== undefined) {
      const newNutritionalInfo = updateMenuItemDto.nutritional_info;
      const oldNutritionalInfo = (menuItem.nutritionalInfo as object) || {};

      // Merge existing nutritional info with updates
      const mergedNutritionalInfo = {
        ...oldNutritionalInfo,
        ...newNutritionalInfo,
      };

      updateData.nutritionalInfo = mergedNutritionalInfo;
    }

    // Handle image_urls update
    if (updateMenuItemDto.image_urls !== undefined) {
      // Delete existing images
      await this.prisma.menuItemImage.deleteMany({
        where: { menuItemId: id },
      });

      // Create new images if any
      if (updateMenuItemDto.image_urls.length > 0) {
        await this.prisma.menuItemImage.createMany({
          data: updateMenuItemDto.image_urls.map((url, index) => ({
            menuItemId: id,
            imageUrl: url,
            displayOrder: index,
          })),
        });
      }
    }

    //Handle update modifier groups
    if (updateMenuItemDto.modifier_group_ids !== undefined) {
      // Delete existing modifier group links
      await this.prisma.menuItemModifierGroup.deleteMany({
        where: { menuItemId: id },
      });

      // Create new links if any
      if (updateMenuItemDto.modifier_group_ids.length > 0) {
        await this.prisma.menuItemModifierGroup.createMany({
          data: updateMenuItemDto.modifier_group_ids.map((modifierGroupId) => ({
            menuItemId: id,
            modifierGroupId,
          })),
        });
      }
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
        modifierGroups: {
          select: {
            id: true,
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
        nutritional_info: updatedMenuItem.nutritionalInfo,
        modifier_groups: updatedMenuItem.modifierGroups,
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

  // ============================================
  // Import / Export Implementation
  // ============================================

  private parseBoolean(value: any) {
    if (value === true || value === 'true' || value === '1' || value === 1) {
      return true;
    }
    return false;
  }

  private async processModifiersForMenuItem(
    tenantId: string,
    menuItemId: string,
    modifiersStr: string,
  ) {
    if (!modifiersStr) return;

    // First, remove all existing modifier groups for this menu item
    await this.prisma.menuItemModifierGroup.deleteMany({
      where: { menuItemId },
    });

    let modifierGroups: any[];
    try {
      modifierGroups = JSON.parse(modifiersStr);
    } catch (error) {
      this.logger.warn(`Failed to parse modifiers JSON: ${modifiersStr}`);
      return;
    }

    for (const mg of modifierGroups) {
      const {
        name: groupName,
        type = 'single_choice',
        isRequired = false,
        minSelections = 0,
        maxSelections = 1,
        modifiers = [],
      } = mg;

      // Find or create modifier group
      let modifierGroup = await this.prisma.modifierGroup.findFirst({
        where: { tenantId, name: groupName },
      });
      if (!modifierGroup) {
        modifierGroup = await this.prisma.modifierGroup.create({
          data: {
            tenantId,
            name: groupName,
            type,
            isRequired,
            minSelections,
            maxSelections,
            displayOrder: 0,
          },
        });
      } else {
        // Update existing group with the imported values
        modifierGroup = await this.prisma.modifierGroup.update({
          where: { id: modifierGroup.id },
          data: {
            type,
            isRequired,
            minSelections,
            maxSelections,
          },
        });
      }

      // Process modifiers
      for (const mod of modifiers) {
        const { name: modName, priceAdjustment = 0 } = mod;

        // Find or create modifier
        let modifier = await this.prisma.modifier.findFirst({
          where: { modifierGroupId: modifierGroup.id, name: modName },
        });
        if (!modifier) {
          modifier = await this.prisma.modifier.create({
            data: {
              modifierGroupId: modifierGroup.id,
              name: modName,
              priceAdjustment,
              isAvailable: true,
              displayOrder: 0,
            },
          });
        } else {
          // Update existing modifier with the imported values
          modifier = await this.prisma.modifier.update({
            where: { id: modifier.id },
            data: {
              name: modName,
              priceAdjustment,
            },
          });
        }
      }

      // Link the modifier group to the menu item
      await this.prisma.menuItemModifierGroup.create({
        data: { menuItemId, modifierGroupId: modifierGroup.id },
      });
    }
  }

  private async validateImportFile(file: Express.Multer.File) {
    const ext = (file.originalname || '').toLowerCase();
    const maxSize = 10 * 1024 * 1024; // 10MB

    // Check file size
    if (file.size > maxSize) {
      throw new BadRequestException(
        t(
          'menu.import.fileTooLarge',
          `File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`,
        ),
      );
    }

    // Check file type
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const isAllowedType =
      allowedTypes.some((type) => ext.endsWith(type)) ||
      file.mimetype.includes('csv') ||
      file.mimetype.includes('spreadsheet');

    if (!isAllowedType) {
      throw new BadRequestException(
        t(
          'menu.import.invalidFileType',
          'Invalid file type. Only CSV and Excel files are allowed.',
        ),
      );
    }

    // Validate file content
    if (ext.endsWith('.csv') || file.mimetype.includes('csv')) {
      await this.validateCsvFile(file);
    } else {
      await this.validateExcelFile(file);
    }
  }

  private async validateCsvFile(file: Express.Multer.File) {
    const stream = Readable.from(file.buffer);
    let headers: string[] = [];
    const data: Record<string, any>[] = [];
    let rowCount = 0;
    const maxRows = 1000; // Check first 1000 rows

    try {
      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(csvParser({ mapHeaders: ({ header }) => header.trim() }))
          .on('headers', (headerList: string[]) => {
            headers = headerList;
          })
          .on('data', (row) => {
            rowCount++;
            data.push(row);
            if (rowCount > maxRows) {
              stream.destroy();
              resolve();
            }
          })
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });
    } catch (error) {
      throw new BadRequestException(
        t('menu.import.invalidCsvFormat', 'Invalid CSV file format'),
      );
    }

    // Check required headers
    const requiredHeaders = ['name'];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        t(
          'menu.import.missingRequiredColumns',
          `Missing required columns: ${missingHeaders.join(', ')}`,
          { args: { columns: missingHeaders.join(', ') } },
        ),
      );
    }

    if (rowCount === 0) {
      throw new BadRequestException(
        t(
          'menu.import.emptyCsvFile',
          'CSV file is empty or contains no valid data rows',
        ),
      );
    }

    // Validate modifier structure in sample rows
    if (headers.includes('modifiers')) {
      await this.validateModifierStructure(headers, data.slice(0, 5)); // Check first 5 rows
    }

    // Validate nutritional info structure in sample rows
    if (headers.includes('nutritional_info')) {
      await this.validateNutritionalInfoStructure(headers, data.slice(0, 5)); // Check first 5 rows
    }
  }

  private validateModifierStructure(
    headers: string[],
    sampleRows: Record<string, any>[],
  ) {
    const modifierIndex = headers.indexOf('modifiers');

    for (const row of sampleRows) {
      const modifiersStr = row[headers[modifierIndex]];
      if (!modifiersStr || modifiersStr.trim() === '') continue; // Skip empty modifiers

      let modifierGroups: any;
      try {
        modifierGroups = JSON.parse(modifiersStr);
      } catch (error) {
        throw new BadRequestException(
          t(
            'menu.import.invalidModifierJson',
            `Invalid modifier JSON structure: ${error.message}`,
          ),
        );
      }

      if (!Array.isArray(modifierGroups)) {
        throw new BadRequestException(
          t(
            'menu.import.invalidModifiersFormat',
            'Modifiers must be a JSON array of modifier groups',
          ),
        );
      }

      for (const group of modifierGroups) {
        if (typeof group !== 'object' || group === null) {
          throw new BadRequestException(
            t(
              'menu.import.invalidModifierGroup',
              'Each modifier group must be an object',
            ),
          );
        }

        // Required fields for modifier group
        const requiredGroupFields = [
          'name',
          'type',
          'isRequired',
          'minSelections',
          'maxSelections',
          'modifiers',
        ];
        for (const field of requiredGroupFields) {
          if (!(field in group)) {
            throw new BadRequestException(
              t(
                'menu.import.missingModifierGroupField',
                `Modifier group missing required field: ${field}`,
                { args: { field } },
              ),
            );
          }
        }

        if (!['single_choice', 'multiple_choice'].includes(group.type)) {
          throw new BadRequestException(
            t(
              'menu.import.invalidModifierGroupType',
              'Modifier group type must be "single_choice" or "multiple_choice"',
            ),
          );
        }

        if (typeof group.isRequired !== 'boolean') {
          throw new BadRequestException(
            t(
              'menu.import.invalidModifierGroupRequired',
              'Modifier group isRequired must be a boolean',
            ),
          );
        }

        if (
          typeof group.minSelections !== 'number' ||
          group.minSelections < 0
        ) {
          throw new BadRequestException(
            t(
              'menu.import.invalidModifierGroupMinSelections',
              'Modifier group minSelections must be a non-negative number',
            ),
          );
        }

        if (
          typeof group.maxSelections !== 'number' ||
          group.maxSelections < 0
        ) {
          throw new BadRequestException(
            t(
              'menu.import.invalidModifierGroupMaxSelections',
              'Modifier group maxSelections must be a non-negative number',
            ),
          );
        }

        if (group.minSelections > group.maxSelections) {
          throw new BadRequestException(
            t(
              'menu.import.invalidModifierGroupSelections',
              'Modifier group minSelections cannot be greater than maxSelections',
            ),
          );
        }

        if (!Array.isArray(group.modifiers)) {
          throw new BadRequestException(
            t(
              'menu.import.invalidModifierGroupModifiers',
              'Modifier group modifiers must be an array',
            ),
          );
        }

        // Validate modifiers
        for (const modifier of group.modifiers) {
          if (typeof modifier !== 'object' || modifier === null) {
            throw new BadRequestException(
              t(
                'menu.import.invalidModifier',
                'Each modifier must be an object',
              ),
            );
          }

          const requiredModifierFields = ['name', 'priceAdjustment'];
          for (const field of requiredModifierFields) {
            if (!(field in modifier)) {
              throw new BadRequestException(
                t(
                  'menu.import.missingModifierField',
                  `Modifier missing required field: ${field}`,
                  { args: { field } },
                ),
              );
            }
          }

          if (typeof modifier.name !== 'string' || !modifier.name.trim()) {
            throw new BadRequestException(
              t(
                'menu.import.invalidModifierName',
                'Modifier name must be a non-empty string',
              ),
            );
          }

          if (
            typeof modifier.priceAdjustment !== 'number' &&
            isNaN(Number(modifier.priceAdjustment))
          ) {
            throw new BadRequestException(
              t(
                'menu.import.invalidModifierPrice',
                'Modifier priceAdjustment must be a number',
              ),
            );
          }
        }
      }
    }
  }

  private validateNutritionalInfoStructure(
    headers: string[],
    sampleRows: Record<string, any>[],
  ) {
    const nutritionalIndex = headers.indexOf('nutritional_info');

    for (const row of sampleRows) {
      const nutritionalStr = row[headers[nutritionalIndex]];
      if (!nutritionalStr || nutritionalStr.trim() === '') continue; // Skip empty nutritional info

      let nutritional: any;
      try {
        nutritional = JSON.parse(nutritionalStr);
      } catch (error) {
        throw new BadRequestException(
          t(
            'menu.import.invalidNutritionalJson',
            `Invalid nutritional info JSON: ${error.message}`,
            { args: { error: error.message } },
          ),
        );
      }

      if (typeof nutritional !== 'object' || nutritional === null) {
        throw new BadRequestException(
          t(
            'menu.import.invalidNutritionalFormat',
            'Nutritional info must be a JSON object',
          ),
        );
      }

      const requiredKeys = ['fat', 'carbs', 'protein', 'calories'];
      for (const key of requiredKeys) {
        if (!(key in nutritional)) {
          throw new BadRequestException(
            t(
              'menu.import.missingNutritionalKey',
              `Nutritional info missing required key: ${key}`,
              { args: { key } },
            ),
          );
        }

        if (typeof nutritional[key] !== 'number') {
          throw new BadRequestException(
            t(
              'menu.import.invalidNutritionalValue',
              `Nutritional info ${key} must be a number`,
              { args: { key } },
            ),
          );
        }
      }
    }
  }

  private async validateExcelFile(file: Express.Multer.File) {
    try {
      const workbook = new ExcelJS.Workbook();
      const buf = Buffer.isBuffer(file.buffer)
        ? file.buffer
        : Buffer.from(file.buffer);
      await workbook.xlsx.load(buf as any);

      const sheet = workbook.worksheets[0];
      if (!sheet) {
        throw new BadRequestException(
          t('menu.import.noWorksheets', 'Excel file contains no worksheets'),
        );
      }

      // Check headers
      const headers: string[] = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          const values = row.values as any[];
          headers.push(...values.slice(1).map((v) => String(v || '').trim()));
        }
      });

      // Check required headers
      const requiredHeaders = ['name'];
      const missingHeaders = requiredHeaders.filter(
        (h) => !headers.includes(h),
      );
      if (missingHeaders.length > 0) {
        throw new BadRequestException(
          t(
            'menu.import.missingRequiredColumns',
            `Missing required columns: ${missingHeaders.join(', ')}`,
            { args: { columns: missingHeaders.join(', ') } },
          ),
        );
      }

      // Collect sample rows for modifier validation
      const sampleRows: Record<string, any>[] = [];
      let dataRowCount = 0;
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          dataRowCount++;
          if (sampleRows.length < 5) {
            // Collect first 5 data rows
            const obj: Record<string, any> = {};
            headers.forEach((h, i) => {
              obj[h] = row.values?.[i + 1] || '';
            });
            sampleRows.push(obj);
          }
        }
      });

      if (dataRowCount === 0) {
        throw new BadRequestException(
          t('menu.import.emptyExcelFile', 'Excel file contains no data rows'),
        );
      }

      // Validate modifier structure in sample rows
      if (headers.includes('modifiers')) {
        this.validateModifierStructure(headers, sampleRows);
      }

      // Validate nutritional info structure in sample rows
      if (headers.includes('nutritional_info')) {
        this.validateNutritionalInfoStructure(headers, sampleRows);
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        t('menu.import.invalidExcelFormat', 'Invalid Excel file format'),
      );
    }
  }

  async import(tenantId: string, file: Express.Multer.File, mode: string) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file before processing
    await this.validateImportFile(file);

    const ext = (file.originalname || '').toLowerCase();
    let rows: Record<string, any>[] = [];

    // parse file into rows
    if (ext.endsWith('.csv') || file.mimetype.includes('csv')) {
      // parse CSV
      const stream = Readable.from(file.buffer);
      rows = await new Promise((resolve, reject) => {
        const data: Record<string, any>[] = [];
        stream
          .pipe(csvParser({ mapHeaders: ({ header }) => header.trim() }))
          .on('data', (row) => data.push(row))
          .on('end', () => resolve(data))
          .on('error', (err) => reject(err));
      });
    } else {
      // parse Excel
      const workbook = new ExcelJS.Workbook();
      const buf = Buffer.isBuffer(file.buffer)
        ? file.buffer
        : Buffer.from(file.buffer);
      await workbook.xlsx.load(buf as any);
      // pick first sheet
      const sheet = workbook.worksheets[0];
      const headers: string[] = [];
      sheet.eachRow((row, rowNumber) => {
        const values = row.values as any[];
        if (rowNumber === 1) {
          headers.push(...values.slice(1).map((v) => String(v || '').trim()));
        } else {
          const obj: Record<string, any> = {};
          headers.forEach((h, i) => {
            obj[h] = values[i + 1] || '';
          });
          rows.push(obj);
        }
      });
    }

    // Process menu items from the exported file
    const result = { created: 0, updated: 0 };

    for (const r of rows) {
      const name = (r.name || r.Name || '').toString().trim();
      if (!name) continue; // skip rows without a name

      const basePrice = r.base_price ?? r.BasePrice ?? r['base price'] ?? '';
      const categoryName =
        r.category || r.Category || r.category_name || r['category name'];
      const description = r.description || r.Description || '';
      const status = r.status || 'available';
      const isChef = this.parseBoolean(
        r.is_chef_recommendation ||
          r.IsChefRecommendation ||
          r['is_chef_recommendation'],
      );
      const preparationTime =
        r.preparation_time ?? r.preparationTime ?? r['preparation time'] ?? '';
      const allergenInfo =
        r.allergen_info ?? r.allergenInfo ?? r['allergen info'] ?? '';
      const modifiers = r.modifiers || '';
      const nutritionalInfo =
        r.nutritional_info ?? r.nutritionalInfo ?? r['nutritional info'] ?? '';

      // resolve or create category if provided
      let categoryId: string | null = null;
      if (categoryName && String(categoryName).trim()) {
        const exists = await this.prisma.category.findFirst({
          where: { tenantId, name: String(categoryName).trim() },
        });
        if (exists) {
          categoryId = exists.id;
        } else if (mode !== 'update') {
          const createdCat = await this.prisma.category.create({
            data: { tenantId, name: String(categoryName).trim() },
          });
          categoryId = createdCat.id;
        }
      }

      // find existing menu item by name
      const existing = await this.prisma.menuItem.findFirst({
        where: { tenantId, name },
      });

      let menuItem: any;
      if (existing) {
        if (mode === 'create') {
          // skip
          continue;
        }

        // update
        menuItem = await this.prisma.menuItem.update({
          where: { id: existing.id },
          data: {
            description: description || existing.description,
            basePrice:
              basePrice !== '' ? Number(basePrice) : existing.basePrice,
            preparationTime:
              preparationTime !== ''
                ? Number(preparationTime)
                : existing.preparationTime,
            status: status || existing.status,
            isChefRecommendation: isChef,
            allergenInfo: allergenInfo || existing.allergenInfo,
            categoryId: categoryId || existing.categoryId,
            nutritionalInfo: nutritionalInfo || existing.nutritionalInfo,
          },
        });
        result.updated += 1;
      } else {
        if (mode === 'update') {
          continue; // nothing to update
        }

        // create
        menuItem = await this.prisma.menuItem.create({
          data: {
            tenantId,
            name,
            description,
            basePrice: basePrice !== '' ? Number(basePrice) : 0,
            preparationTime:
              preparationTime !== '' ? Number(preparationTime) : 0,
            status: status || 'available',
            isChefRecommendation: isChef,
            allergenInfo: allergenInfo,
            categoryId: categoryId || undefined,
            nutritionalInfo,
          },
        });
        result.created += 1;
      }

      // Process modifiers
      await this.processModifiersForMenuItem(tenantId, menuItem.id, modifiers);

      // Process images
      if (r.images) {
        const imageUrls = r.images.split(';').filter((url) => url.trim());
        // First, delete existing images
        await this.prisma.menuItemImage.deleteMany({
          where: { menuItemId: menuItem.id },
        });
        for (let i = 0; i < imageUrls.length; i++) {
          await this.prisma.menuItemImage.create({
            data: {
              menuItemId: menuItem.id,
              imageUrl: imageUrls[i].trim(),
              displayOrder: i,
              isPrimary: i === 0,
            },
          });
        }
      }
    }

    return {
      success: true,
      data: result,
    };
  }

  async export(tenantId: string, opts: any) {
    const format = opts.format || 'csv';
    const where: any = { tenantId };
    if (opts.scope === 'category' && opts.categoryId) {
      where.categoryId = opts.categoryId;
    }

    const include: any = {
      category: { select: { id: true, name: true } },
    };

    if (opts.includeImages) {
      include.images = {
        select: { imageUrl: true, displayOrder: true },
        orderBy: { displayOrder: 'asc' },
      };
    }

    if (opts.includeModifiers) {
      include.modifierGroups = {
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
                select: { name: true, priceAdjustment: true },
                orderBy: { displayOrder: 'asc' },
              },
            },
          },
        },
        orderBy: { modifierGroup: { displayOrder: 'asc' } },
      };
    }

    const items = await this.prisma.menuItem.findMany({
      where,
      include,
      orderBy: { createdAt: 'asc' },
    });

    const rows = items.map((it: any) => ({
      name: it.name,
      description: it.description,
      base_price: Number(it.basePrice),
      preparation_time: it.preparationTime,
      status: it.status,
      is_chef_recommendation: it.isChefRecommendation,
      allergen_info: it.allergenInfo,
      nutritional_info: it.nutritionalInfo
        ? JSON.stringify(it.nutritionalInfo)
        : '',
      category: it.category ? it.category.name : '',
      images: it.images ? it.images.map((i: any) => i.imageUrl).join(';') : '',
      modifiers: it.modifierGroups
        ? JSON.stringify(
            it.modifierGroups.map((mg: any) => ({
              name: mg.modifierGroup.name,
              type: mg.modifierGroup.type,
              isRequired: mg.modifierGroup.isRequired,
              minSelections: mg.modifierGroup.minSelections,
              maxSelections: mg.modifierGroup.maxSelections,
              modifiers: mg.modifierGroup.modifiers.map((m: any) => ({
                name: m.name,
                priceAdjustment: m.priceAdjustment,
              })),
            })),
          )
        : '',
    }));

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Items');
      const header = Object.keys(
        rows[0] || {
          name: '',
          description: '',
          base_price: '',
          preparation_time: '',
          status: '',
          is_chef_recommendation: '',
          allergen_info: '',
          nutritional_info: '',
          category: '',
          images: '',
          modifiers: '',
        },
      );
      sheet.addRow(header);
      for (const r of rows) {
        sheet.addRow(header.map((h) => r[h]));
      }
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `menu-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      return new StreamableFile(Buffer.from(buffer as any), {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        disposition: `attachment; filename="${filename}"`,
      });
    }

    // default CSV
    const escapeCsv = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      // Don't quote numbers
      if (!isNaN(Number(s)) && s.trim() === s) {
        return s;
      }
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const header = Object.keys(
      rows[0] || {
        name: '',
        description: '',
        base_price: '',
        preparation_time: '',
        status: '',
        is_chef_recommendation: '',
        allergen_info: '',
        nutritional_info: '',
        category: '',
        images: '',
        modifiers: '',
      },
    );
    const csvLines = [header.join(',')];
    for (const r of rows) {
      csvLines.push(header.map((h) => escapeCsv(r[h])).join(','));
    }
    const csv = csvLines.join('\n');
    const filename = `menu-export-${new Date().toISOString().split('T')[0]}.csv`;
    return new StreamableFile(Buffer.from(csv, 'utf-8'), {
      type: 'text/csv',
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
