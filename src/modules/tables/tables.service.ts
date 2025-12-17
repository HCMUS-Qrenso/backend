import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { t } from '../../common/utils';
import {
  CreateTableDto,
  UpdateTableDto,
  QueryTablesDto,
  UpdatePositionDto,
  BatchUpdateLayoutDto,
  GenerateQrDto,
  BatchGenerateQrDto,
  QueryQrDto,
  DownloadFormat,
} from './dto';
import * as jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import archiver from 'archiver';
import { Readable } from 'stream';

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly QR_API_URL =
    process.env.QR_API_URL || 'https://api.qrserver.com/v1/create-qr-code/';
  private readonly APP_ORDER_URL =
    process.env.APP_ORDER_URL || 'localhost:3002';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated list of tables with filtering
   */
  async findAll(tenantId: string, query: QueryTablesDto) {
    const {
      page = 1,
      limit = 10,
      search,
      zone_id,
      status,
      is_active,
      sort_by = 'tableNumber',
      sort_order = 'asc',
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenantId,
    };

    if (search) {
      where.tableNumber = { contains: search, mode: 'insensitive' };
    }

    if (zone_id) {
      where.zoneId = zone_id;
    }

    if (status) {
      where.status = status;
    }

    if (is_active !== undefined) {
      where.isActive = is_active;
    }

    // Validate and set orderBy
    const validSortFields = ['tableNumber', 'status', 'createdAt', 'updatedAt'];
    const orderByField = validSortFields.includes(sort_by)
      ? sort_by
      : 'tableNumber';
    const orderBy = { [orderByField]: sort_order };

    // Get total count
    const total = await this.prisma.table.count({ where });

    // Get tables with current order info and zone
    const tables = await this.prisma.table.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
        orders: {
          where: {
            status: {
              notIn: ['completed', 'cancelled', 'abandoned'],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            orderNumber: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });

    // Format response
    const formattedTables = tables.map((table) => {
      const position = table.position ? JSON.parse(table.position) : null;
      const currentOrder =
        table.status === 'occupied' && table.orders.length > 0
          ? table.orders[0]
          : null;

      return {
        id: table.id,
        table_number: table.tableNumber,
        capacity: table.capacity,
        zone: table.zone
          ? {
              id: table.zone.id,
              name: table.zone.name,
            }
          : null,
        shape: table.shape,
        status: table.status,
        is_active: table.isActive,
        position: position
          ? {
              x: position.x || 0,
              y: position.y || 0,
              rotation: position.rotation || 0,
            }
          : null,
        current_order: currentOrder
          ? {
              order_number: currentOrder.orderNumber,
              total_amount: currentOrder.totalAmount,
              status: currentOrder.status,
            }
          : null,
        created_at: table.createdAt,
        updated_at: table.updatedAt,
      };
    });

    return {
      success: true,
      data: {
        tables: formattedTables,
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
   * Get table statistics
   */
  async getStats(tenantId: string) {
    const stats = await this.prisma.table.groupBy({
      by: ['status', 'isActive'],
      where: { tenantId },
      _count: true,
    });

    const totalTables = stats
      .filter((s) => s.isActive)
      .reduce((acc, s) => acc + s._count, 0);
    const availableTables =
      stats.find((s) => s.status === 'available' && s.isActive)?._count || 0;
    const occupiedTables =
      stats.find((s) => s.status === 'occupied' && s.isActive)?._count || 0;
    const maintenanceTables =
      stats.find((s) => s.status === 'maintenance' && s.isActive)?._count || 0;
    const inactiveTables = stats
      .filter((s) => !s.isActive)
      .reduce((acc, s) => acc + s._count, 0);

    // Get waiting for payment count (occupied tables with orders in ready/served status)
    const waitingForPayment = await this.prisma.table.count({
      where: {
        tenantId,
        status: 'occupied',
        isActive: true,
        orders: {
          some: {
            status: {
              in: ['ready', 'served'],
            },
          },
        },
      },
    });

    return {
      success: true,
      data: {
        total_tables: totalTables,
        available_tables: availableTables,
        occupied_tables: occupiedTables,
        waiting_for_payment: waitingForPayment,
        maintenance_tables: maintenanceTables,
        inactive_tables: inactiveTables,
      },
    };
  }

  /**
   * Create a new table
   */
  async create(tenantId: string, createTableDto: CreateTableDto) {
    // Check if table number already exists for this tenant
    const existing = await this.prisma.table.findUnique({
      where: {
        tenantId_tableNumber: {
          tenantId,
          tableNumber: createTableDto.table_number,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        t(
          'tables.tableNameExists',
          'A table with this name already exists in this restaurant',
        ),
      );
    }

    // Prepare position data
    const position = createTableDto.position
      ? JSON.stringify({
          x: createTableDto.position.x || 0,
          y: createTableDto.position.y || 0,
          rotation: createTableDto.position.rotation || 0,
        })
      : JSON.stringify({ x: 0, y: 0 });

    // Create table
    const table = await this.prisma.table.create({
      data: {
        tenantId,
        tableNumber: createTableDto.table_number,
        capacity: createTableDto.capacity,
        zoneId: createTableDto.zone_id,
        shape: createTableDto.shape,
        status: createTableDto.status || 'available',
        isActive: createTableDto.is_active ?? true,
        position,
      },
    });

    // Generate QR code if requested
    let qrData: any = null;
    if (createTableDto.auto_generate_qr) {
      qrData = await this.generateQrCode(tenantId, table.id);
    }

    const parsedPosition = JSON.parse(table.position || '{}');

    return {
      success: true,
      message: t('tables.tableCreatedSuccess', 'Table created successfully'),
      data: {
        id: table.id,
        table_number: table.tableNumber,
        capacity: table.capacity,
        zone_id: table.zoneId,
        shape: table.shape,
        status: table.status,
        is_active: table.isActive,
        position: {
          x: parsedPosition.x || 0,
          y: parsedPosition.y || 0,
          rotation: parsedPosition.rotation || 0,
        },
        qr_code_url: qrData?.qr_code_url || null,
        ordering_url: qrData?.ordering_url || null,
        created_at: table.createdAt,
        updated_at: table.updatedAt,
      },
    };
  }

  /**
   * Get table by ID
   */
  async findOne(tenantId: string, id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id, tenantId },
      include: {
        tenant: {
          select: {
            slug: true,
          },
        },
        orders: {
          where: {
            status: {
              notIn: ['completed', 'cancelled', 'abandoned'],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!table) {
      throw new NotFoundException(
        t('tables.tableNotFoundOrDenied', 'Table not found or access denied'),
      );
    }

    const position = table.position ? JSON.parse(table.position) : null;
    const currentOrder =
      table.status === 'occupied' && table.orders.length > 0
        ? table.orders[0]
        : null;

    return {
      success: true,
      data: {
        id: table.id,
        table_number: table.tableNumber,
        capacity: table.capacity,
        zone_id: table.zoneId,
        shape: table.shape,
        status: table.status,
        is_active: table.isActive,
        position: position
          ? {
              x: position.x || 0,
              y: position.y || 0,
              rotation: position.rotation || 0,
            }
          : null,
        qr_code_token: table.qrCodeToken,
        qr_code_url: table.qrCodeUrl,
        ordering_url: table.orderingUrl,
        qr_code_generated_at: table.qrCodeGeneratedAt,
        current_order: currentOrder
          ? {
              order_number: currentOrder.orderNumber,
              total_amount: currentOrder.totalAmount,
              status: currentOrder.status,
            }
          : null,
        created_at: table.createdAt,
        updated_at: table.updatedAt,
      },
    };
  }

  /**
   * Update table
   */
  async update(tenantId: string, id: string, updateTableDto: UpdateTableDto) {
    const table = await this.prisma.table.findUnique({
      where: { id, tenantId },
    });

    if (!table) {
      throw new NotFoundException(
        t('tables.tableNotFoundOrDenied', 'Table not found or access denied'),
      );
    }

    // Check table number uniqueness if changing
    if (
      updateTableDto.table_number &&
      updateTableDto.table_number !== table.tableNumber
    ) {
      const existing = await this.prisma.table.findUnique({
        where: {
          tenantId_tableNumber: {
            tenantId,
            tableNumber: updateTableDto.table_number,
          },
        },
      });

      if (existing) {
        throw new ConflictException(
          t(
            'tables.tableNameExists',
            'A table with this name already exists in this restaurant',
          ),
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (updateTableDto.table_number !== undefined) {
      updateData.tableNumber = updateTableDto.table_number;
    }
    if (updateTableDto.capacity !== undefined) {
      updateData.capacity = updateTableDto.capacity;
    }
    if (updateTableDto.zone_id !== undefined) {
      updateData.zoneId = updateTableDto.zone_id;
    }
    if (updateTableDto.shape !== undefined) {
      updateData.shape = updateTableDto.shape;
    }
    if (updateTableDto.status !== undefined) {
      updateData.status = updateTableDto.status;
    }
    if (updateTableDto.is_active !== undefined) {
      updateData.isActive = updateTableDto.is_active;
    }
    if (updateTableDto.position !== undefined) {
      const currentPosition = table.position ? JSON.parse(table.position) : {};
      updateData.position = JSON.stringify({
        x: updateTableDto.position.x ?? currentPosition.x ?? 0,
        y: updateTableDto.position.y ?? currentPosition.y ?? 0,
        rotation:
          updateTableDto.position.rotation ?? currentPosition.rotation ?? 0,
      });
    }

    const updatedTable = await this.prisma.table.update({
      where: { id },
      data: updateData,
    });

    const parsedPosition = updatedTable.position
      ? JSON.parse(updatedTable.position)
      : null;

    return {
      success: true,
      message: t('tables.tableUpdatedSuccess', 'Table updated successfully'),
      data: {
        id: updatedTable.id,
        table_number: updatedTable.tableNumber,
        capacity: updatedTable.capacity,
        zone_id: updatedTable.zoneId,
        shape: updatedTable.shape,
        status: updatedTable.status,
        is_active: updatedTable.isActive,
        position: parsedPosition
          ? {
              x: parsedPosition.x || 0,
              y: parsedPosition.y || 0,
              rotation: parsedPosition.rotation || 0,
            }
          : null,
        updated_at: updatedTable.updatedAt,
      },
    };
  }

  /**
   * Delete table (soft delete)
   */
  async remove(tenantId: string, id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id, tenantId },
      include: {
        orders: {
          where: {
            status: {
              notIn: ['completed', 'cancelled', 'abandoned'],
            },
          },
        },
        sessions: {
          where: {
            status: 'active',
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException(
        t('tables.tableNotFoundOrDenied', 'Table not found or access denied'),
      );
    }

    // Check if table has active orders or sessions
    if (table.orders.length > 0 || table.sessions.length > 0) {
      throw new ConflictException(
        t(
          'tables.cannotDeleteActiveOrders',
          'Cannot delete table with active orders',
        ),
      );
    }

    // Soft delete (set is_active to false)
    await this.prisma.table.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      success: true,
      message: t('tables.tableDeletedSuccess', 'Table deleted successfully'),
    };
  }

  /**
   * Get layout by zone
   */
  async getLayout(tenantId: string, zoneId: string) {
    const tables = await this.prisma.table.findMany({
      where: {
        tenantId,
        zoneId,
        isActive: true,
      },
      include: {
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { tableNumber: 'asc' },
    });

    const formattedTables = tables.map((table) => {
      const position = table.position ? JSON.parse(table.position) : {};

      return {
        id: table.id,
        table_number: table.tableNumber,
        type: this.mapShapeToType(table.shape),
        name: table.tableNumber,
        seats: table.capacity,
        zone: table.zone?.name || null,
        status: table.status,
        position: {
          x: position.x || 0,
          y: position.y || 0,
          rotation: position.rotation || 0,
        },
      };
    });

    return {
      success: true,
      data: {
        zone_id: zoneId,
        zone_name: tables[0]?.zone?.name || null,
        tables: formattedTables,
      },
    };
  }

  /**
   * Update table position
   */
  async updatePosition(
    tenantId: string,
    id: string,
    updatePositionDto: UpdatePositionDto,
  ) {
    const table = await this.prisma.table.findUnique({
      where: { id, tenantId },
    });

    if (!table) {
      throw new NotFoundException(
        t('tables.tableNotFoundOrDenied', 'Table not found or access denied'),
      );
    }

    const newPosition = {
      x: updatePositionDto.position.x,
      y: updatePositionDto.position.y,
      rotation: updatePositionDto.position.rotation,
    };

    const updatedTable = await this.prisma.table.update({
      where: { id },
      data: {
        position: JSON.stringify(newPosition),
      },
    });

    return {
      success: true,
      message: t(
        'tables.tablePositionUpdatedSuccess',
        'Table position updated successfully',
      ),
      data: {
        id: updatedTable.id,
        position: newPosition,
        updated_at: updatedTable.updatedAt,
      },
    };
  }

  /**
   * Batch update layout
   */
  async batchUpdateLayout(
    tenantId: string,
    batchUpdateDto: BatchUpdateLayoutDto,
  ) {
    const { updates } = batchUpdateDto;

    // Verify all tables belong to this tenant
    const tableIds = updates.map((u) => u.table_id);
    const tables = await this.prisma.table.findMany({
      where: {
        id: { in: tableIds },
        tenantId,
      },
    });

    if (tables.length !== tableIds.length) {
      throw new BadRequestException(
        t(
          'tables.invalidTableIdsFormat',
          'Invalid tableIds format. Expected array of numbers.',
        ),
      );
    }

    // Perform batch update
    const results = await Promise.all(
      updates.map(async (update) => {
        const newPosition = {
          x: update.position.x,
          y: update.position.y,
          rotation: update.position.rotation,
        };

        const updatedTable = await this.prisma.table.update({
          where: { id: update.table_id },
          data: {
            position: JSON.stringify(newPosition),
          },
        });

        return {
          id: updatedTable.id,
          position: newPosition,
        };
      }),
    );

    return {
      success: true,
      message: t('tables.layoutUpdatedSuccess', 'Layout updated successfully'),
      data: {
        updated_count: results.length,
        tables: results,
      },
    };
  }

  /**
   * Get available zones
   */
  async getZones(tenantId: string) {
    const zones = await this.prisma.zone.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        displayOrder: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      success: true,
      data: {
        zones: zones.map((z) => ({
          id: z.id,
          name: z.name,
          display_order: z.displayOrder,
        })),
      },
    };
  }

  /**
   * Get all QR codes
   */
  async getAllQrCodes(tenantId: string, query: QueryQrDto) {
    const { status, zone_id } = query;

    const where: any = {
      tenantId,
      isActive: true,
    };

    if (zone_id) {
      where.zoneId = zone_id;
    }

    const tables = await this.prisma.table.findMany({
      where,
      include: {
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
        tenant: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: { tableNumber: 'asc' },
    });

    const formattedTables = tables.map((table) => {
      const qrStatus = this.getQrStatus(table);

      return {
        id: table.id,
        tableNumber: table.tableNumber,
        tableZone: table.zone?.name || null,
        seats: table.capacity,
        qrUrl: table.qrCodeUrl,
        orderingUrl: table.orderingUrl,
        status: qrStatus,
        updatedAt: table.qrCodeGeneratedAt,
      };
    });

    // Filter by status if provided
    const filteredTables = status
      ? formattedTables.filter((t) => t.status.toLowerCase() === status)
      : formattedTables;

    return {
      success: true,
      data: {
        tables: filteredTables,
      },
    };
  }

  /**
   * Generate QR code for a table
   */
  async generateQrCodeForTable(
    tenantId: string,
    id: string,
    generateQrDto: GenerateQrDto,
  ) {
    const table = await this.prisma.table.findUnique({
      where: { id, tenantId },
    });

    if (!table) {
      throw new NotFoundException(
        t('tables.tableNotFoundOrDenied', 'Table not found or access denied'),
      );
    }

    // Check if should regenerate
    if (
      table.qrCodeToken &&
      table.qrCodeUrl &&
      !generateQrDto.force_regenerate
    ) {
      return {
        success: true,
        message: t('tables.qrAlreadyExists', 'QR code already exists'),
        data: {
          id: table.id,
          table_number: table.tableNumber,
          qr_code_token: table.qrCodeToken,
          qr_code_url: table.qrCodeUrl,
          ordering_url: table.orderingUrl,
          qr_code_generated_at: table.qrCodeGeneratedAt,
        },
      };
    }

    const qrData = await this.generateQrCode(tenantId, id);

    return {
      success: true,
      message: t('tables.qrGeneratedSuccess', 'QR code generated successfully'),
      data: qrData,
    };
  }

  /**
   * Batch generate QR codes
   */
  async batchGenerateQrCodes(
    tenantId: string,
    batchGenerateDto: BatchGenerateQrDto,
  ) {
    let tableIds = batchGenerateDto.table_ids;

    // If no table_ids provided, get all active tables
    if (!tableIds || tableIds.length === 0) {
      const tables = await this.prisma.table.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        select: { id: true },
      });
      tableIds = tables.map((t) => t.id);
    }

    const results = await Promise.all(
      tableIds.map(async (tableId) => {
        try {
          const table = await this.prisma.table.findUnique({
            where: { id: tableId, tenantId },
          });

          if (!table) {
            return {
              table_id: tableId,
              table_number: null,
              success: false,
              error: 'Table not found',
            };
          }

          // Skip if already has QR and not forcing regeneration
          if (
            table.qrCodeToken &&
            table.qrCodeUrl &&
            !batchGenerateDto.force_regenerate
          ) {
            return {
              table_id: table.id,
              table_number: table.tableNumber,
              success: true,
              qr_code_url: table.qrCodeUrl,
              skipped: true,
            };
          }

          const qrData = await this.generateQrCode(tenantId, tableId);

          return {
            table_id: table.id,
            table_number: table.tableNumber,
            success: true,
            qr_code_url: qrData.qr_code_url,
          };
        } catch (error) {
          this.logger.error(`Error generating QR for table ${tableId}:`, error);
          return {
            table_id: tableId,
            table_number: null,
            success: false,
            error: error.message,
          };
        }
      }),
    );

    const generatedCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return {
      success: true,
      message: `QR codes generated for ${generatedCount} tables`,
      data: {
        generated_count: generatedCount,
        failed_count: failedCount,
        results,
      },
    };
  }

  /**
   * Get QR code for a specific table
   */
  async getTableQrCode(tenantId: string, id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id, tenantId },
      include: {
        tenant: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException(
        t('tables.tableNotFoundOrDenied', 'Table not found or access denied'),
      );
    }

    return {
      success: true,
      data: {
        id: table.id,
        table_number: table.tableNumber,
        qr_code_token: table.qrCodeToken,
        qr_code_url: table.qrCodeUrl,
        ordering_url: table.orderingUrl,
        qr_code_generated_at: table.qrCodeGeneratedAt,
        status: this.getQrStatus(table),
      },
    };
  }

  /**
   * Update table status only
   */
  async updateStatus(tenantId: string, id: string, status: string) {
    const table = await this.prisma.table.findUnique({
      where: { id, tenantId },
      include: {
        orders: {
          where: {
            status: {
              notIn: ['completed', 'cancelled', 'abandoned'],
            },
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException(
        t('tables.tableNotFoundOrDenied', 'Table not found or access denied'),
      );
    }

    // Prevent setting to available if there are active orders
    if (status === 'available' && table.orders.length > 0) {
      throw new BadRequestException(
        t(
          'tables.invalidTableStatus',
          'Invalid table status. Must be available or unavailable.',
        ),
      );
    }

    const updatedTable = await this.prisma.table.update({
      where: { id },
      data: { status },
    });

    return {
      success: true,
      message: t(
        'tables.tableStatusUpdatedSuccess',
        'Table status updated successfully',
      ),
      data: {
        id: updatedTable.id,
        table_number: updatedTable.tableNumber,
        status: updatedTable.status,
        updated_at: updatedTable.updatedAt,
      },
    };
  }

  // Helper methods

  private async generateQrCode(tenantId: string, tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: {
        tenant: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException(t('tables.tableNotFound', 'Table not found'));
    }

    // Create JWT token with table and tenant information
    const payload = {
      tenant_id: tenantId,
      table_id: tableId,
      table_number: table.tableNumber,
      issued_at: new Date().toISOString(),
    };

    const token = jwt.sign(payload, this.JWT_SECRET, { expiresIn: '365d' });

    // Generate ordering URL with tenant slug and table info
    // This is the actual URL that will be embedded in QR code
    const orderingUrl = `${this.APP_ORDER_URL}/${table.tenant.slug}/menu?table=${tableId}&token=${token}`;

    // Generate external QR image URL for frontend display
    const qrCodeUrl = `${this.QR_API_URL}?size=200x200&data=${encodeURIComponent(orderingUrl)}`;

    // Update table with QR code info
    const updatedTable = await this.prisma.table.update({
      where: { id: tableId },
      data: {
        qrCodeToken: token,
        orderingUrl: orderingUrl, // Store actual ordering link
        qrCodeUrl: qrCodeUrl, // Store external QR image for display
        qrCodeGeneratedAt: new Date(),
      },
    });

    return {
      id: updatedTable.id,
      table_number: updatedTable.tableNumber,
      qr_code_token: token,
      qr_code_url: qrCodeUrl, // External QR image for display
      ordering_url: orderingUrl, // Actual ordering link
      qr_code_generated_at: updatedTable.qrCodeGeneratedAt,
    };
  }

  private getQrStatus(table: any): string {
    if (!table.qrCodeUrl || !table.qrCodeGeneratedAt) {
      return 'Missing';
    }

    const daysSinceGenerated =
      (new Date().getTime() - new Date(table.qrCodeGeneratedAt).getTime()) /
      (1000 * 60 * 60 * 24);

    if (daysSinceGenerated > 90) {
      return 'Outdated';
    }

    return 'Ready';
  }

  private mapShapeToType(shape: string | null): string {
    if (!shape) return 'rectangle';
    switch (shape) {
      case 'circle':
        return 'round';
      case 'oval':
        return 'oval';
      case 'rectangle':
      default:
        return 'rectangle';
    }
  }

  /**
   * Download QR code for a table as PNG or PDF
   */
  async downloadQrCode(
    tenantId: string,
    tableId: string,
    format: DownloadFormat = DownloadFormat.PNG,
  ): Promise<StreamableFile> {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId, tenantId },
      include: { tenant: true },
    });

    if (!table) {
      throw new NotFoundException(
        t('tables.tableNotFoundOrDenied', 'Table not found or access denied'),
      );
    }

    if (!table.qrCodeUrl) {
      throw new BadRequestException(
        t('tables.qrNotGenerated', 'QR code not generated for this table'),
      );
    }

    if (format === DownloadFormat.PNG) {
      // Use the stored ordering URL for high-quality QR generation
      const qrBuffer = await QRCode.toBuffer(table.orderingUrl!, {
        errorCorrectionLevel: 'H',
        width: 512,
        margin: 2,
      });

      return new StreamableFile(qrBuffer, {
        type: 'image/png',
        disposition: `attachment; filename="table-${table.tableNumber}-qr.png"`,
      });
    } else {
      // Generate PDF with branding
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));

      // Use the stored ordering URL for high-quality QR generation
      const qrDataUrl = await QRCode.toDataURL(table.orderingUrl!, {
        errorCorrectionLevel: 'H',
        width: 400,
        margin: 2,
      });

      // Convert data URL to buffer
      const qrImageBuffer = Buffer.from(
        qrDataUrl.replace(/^data:image\/png;base64,/, ''),
        'base64',
      );

      // Add restaurant name/branding
      doc.fontSize(24).text(table.tenant.name, { align: 'center' });
      doc.moveDown();

      // Add table number prominently
      doc.fontSize(36).text(`Table ${table.tableNumber}`, { align: 'center' });
      doc.moveDown(2);

      // Add QR code centered (calculate X position manually)
      const pageWidth = doc.page.width;
      const qrSize = 400;
      const xPosition = (pageWidth - qrSize) / 2;

      doc.image(qrImageBuffer, xPosition, doc.y, {
        width: qrSize,
        height: qrSize,
      });

      doc.moveDown(12); // Move down after the QR code

      // Add instruction text
      doc.fontSize(18).text('Scan to Order', { align: 'center' });

      doc.end();

      return new Promise((resolve) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(
            new StreamableFile(pdfBuffer, {
              type: 'application/pdf',
              disposition: `attachment; filename="table-${table.tableNumber}-qr.pdf"`,
            }),
          );
        });
      });
    }
  }

  /**
   * Download all QR codes as ZIP or PDF
   */
  async downloadAllQrCodes(
    tenantId: string,
    format: DownloadFormat = DownloadFormat.ZIP,
  ): Promise<StreamableFile> {
    const tables = await this.prisma.table.findMany({
      where: {
        tenantId,
        isActive: true,
        qrCodeUrl: { not: null },
      },
      include: {
        tenant: {
          select: { slug: true, name: true },
        },
      },
      orderBy: { tableNumber: 'asc' },
    });

    if (tables.length === 0) {
      throw new BadRequestException(
        t('tables.noTablesWithQr', 'No tables with QR codes found'),
      );
    }

    if (format === DownloadFormat.ZIP) {
      // Generate ZIP with individual PNG files
      const archive = archiver('zip', { zlib: { level: 9 } });

      // Generate QR codes and add to archive using stored ordering URL
      for (const table of tables) {
        const qrBuffer = await QRCode.toBuffer(table.orderingUrl!, {
          errorCorrectionLevel: 'H',
          width: 512,
          margin: 2,
        });

        archive.append(qrBuffer, {
          name: `table-${table.tableNumber}.png`,
        });
      }

      archive.finalize();

      return new StreamableFile(archive as unknown as Readable, {
        type: 'application/zip',
        disposition: 'attachment; filename="qr-codes.zip"',
      });
    } else {
      // Generate single PDF with all QR codes (one per page)
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));

      const restaurantName = tables[0].tenant.name;

      // Process each table on its own page
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];

        // Add new page for each table (except first)
        if (i > 0) {
          doc.addPage();
        }

        // Generate QR code data URL
        const qrDataUrl = await QRCode.toDataURL(table.orderingUrl!, {
          errorCorrectionLevel: 'H',
          width: 400,
          margin: 2,
        });

        const qrImageBuffer = Buffer.from(
          qrDataUrl.replace(/^data:image\/png;base64,/, ''),
          'base64',
        );

        // Add restaurant name/branding
        doc.fontSize(24).text(restaurantName, { align: 'center' });
        doc.moveDown();

        // Add table number prominently
        doc
          .fontSize(36)
          .text(`Table ${table.tableNumber}`, { align: 'center' });
        doc.moveDown(2);

        // Add QR code centered (calculate X position manually)
        const pageWidth = doc.page.width;
        const qrSize = 400;
        const xPosition = (pageWidth - qrSize) / 2;

        doc.image(qrImageBuffer, xPosition, doc.y, {
          width: qrSize,
          height: qrSize,
        });

        doc.moveDown(12); // Move down after the QR code

        // Add instruction text
        doc.fontSize(18).text('Scan to Order', { align: 'center' });
      }

      doc.end();

      return new Promise((resolve) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(
            new StreamableFile(pdfBuffer, {
              type: 'application/pdf',
              disposition: 'attachment; filename="all-qr-codes.pdf"',
            }),
          );
        });
      });
    }
  }

  /**
   * Verify QR code token
   */
  async verifyToken(token: string) {
    try {
      // Verify and decode token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');

      if (typeof decoded === 'string') {
        throw new UnauthorizedException(
          t('tables.invalidTokenFormat', 'Invalid token format'),
        );
      }

      const { table_id, tenant_id } = decoded as {
        table_id: string;
        tenant_id: string;
        table_number: string;
        issued_at: number;
      };

      // Verify table still exists and is active
      const table = await this.prisma.table.findUnique({
        where: { id: table_id, tenantId: tenant_id },
      });

      if (!table) {
        return {
          valid: false,
          error: 'Table not found',
          message: t(
            'tables.qrNoLongerValid',
            'This QR code is no longer valid. Please ask staff for assistance.',
          ),
        };
      }

      if (!table.isActive) {
        return {
          valid: false,
          error: 'Table is inactive',
          message: t(
            'tables.tableUnavailable',
            'This table is currently unavailable. Please ask staff for assistance.',
          ),
        };
      }

      // Check if token has been regenerated (current token doesn't match)
      if (table.qrCodeToken !== token) {
        return {
          valid: false,
          error: 'Token has been regenerated',
          message: t(
            'tables.qrOutdated',
            'This QR code is outdated. Please scan the current QR code on the table.',
          ),
        };
      }

      return {
        valid: true,
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          status: table.status,
          zoneId: table.zoneId,
        },
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return {
          valid: false,
          error: 'Token expired',
          message: t(
            'tables.qrExpired',
            'This QR code has expired. Please ask staff for a new one.',
          ),
        };
      }

      if (error.name === 'JsonWebTokenError') {
        return {
          valid: false,
          error: 'Invalid token',
          message: t(
            'tables.qrInvalid',
            'This QR code is invalid. Please ask staff for assistance.',
          ),
        };
      }

      throw new UnauthorizedException(
        t('tables.tokenVerificationFailed', 'Token verification failed'),
      );
    }
  }

  /**
   * Get QR stats
   */
  async getQrStats(tenantId: string) {
    // Run queries in parallel for better performance
    const [totalActiveTables, tablesWithQr, latestQrUpdate] = await Promise.all(
      [
        this.prisma.table.count({
          where: {
            tenantId,
            isActive: true,
          },
        }),
        this.prisma.table.count({
          where: {
            tenantId,
            isActive: true,
            qrCodeToken: { not: null },
          },
        }),
        this.prisma.table.findFirst({
          where: {
            tenantId,
            isActive: true,
            qrCodeGeneratedAt: { not: null },
          },
          orderBy: { qrCodeGeneratedAt: 'desc' },
          select: { qrCodeGeneratedAt: true },
        }),
      ],
    );

    // Calculate tables without QR
    const tablesWithoutQr = totalActiveTables - tablesWithQr;

    return {
      success: true,
      data: {
        total_active_tables: totalActiveTables,
        tables_with_qr: tablesWithQr,
        tables_without_qr: tablesWithoutQr,
        latest_qr_update: latestQrUpdate?.qrCodeGeneratedAt || null,
      },
    };
  }
}
