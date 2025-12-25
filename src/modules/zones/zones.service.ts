import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { t } from '../../common/utils';
import { CreateZoneDto, UpdateZoneDto, QueryZonesDto } from './dto';

@Injectable()
export class ZonesService {
  private readonly logger = new Logger(ZonesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated list of zones with filtering
   */
  async findAll(tenantId: string, query: QueryZonesDto) {
    const {
      page = 1,
      limit = 10,
      search,
      is_active,
      sort_by = 'displayOrder',
      sort_order = 'asc',
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenantId,
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (is_active !== undefined) {
      where.isActive = is_active;
    }

    // Validate and set orderBy
    const validSortFields = ['name', 'displayOrder', 'createdAt', 'updatedAt'];
    const orderByField = validSortFields.includes(sort_by)
      ? sort_by
      : 'displayOrder';
    const orderBy = [{ [orderByField]: sort_order }];
    if (orderByField !== 'name') {
      orderBy.push({ name: 'asc' });
    }

    // Get total count
    const total = await this.prisma.zone.count({ where });

    // Get zones with table count
    const zones = await this.prisma.zone.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        _count: {
          select: { tables: true },
        },
      },
    });

    // Format response
    const formattedZones = zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      description: zone.description,
      display_order: zone.displayOrder,
      is_active: zone.isActive,
      table_count: zone._count.tables,
      created_at: zone.createdAt,
      updated_at: zone.updatedAt,
    }));

    return {
      data: formattedZones,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single zone by ID
   */
  async findOne(tenantId: string, id: string) {
    const zone = await this.prisma.zone.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        _count: {
          select: { tables: true },
        },
      },
    });

    if (!zone) {
      throw new NotFoundException(t('zones.zoneNotFound', 'Zone not found'));
    }

    return {
      id: zone.id,
      name: zone.name,
      description: zone.description,
      display_order: zone.displayOrder,
      is_active: zone.isActive,
      table_count: zone._count.tables,
      created_at: zone.createdAt,
      updated_at: zone.updatedAt,
    };
  }

  /**
   * Create a new zone
   */
  async create(tenantId: string, createZoneDto: CreateZoneDto) {
    // Check for duplicate name
    const existing = await this.prisma.zone.findFirst({
      where: {
        tenantId,
        name: createZoneDto.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        t('zones.zoneNameExists', 'A zone with this name already exists'),
      );
    }

    const zone = await this.prisma.zone.create({
      data: {
        tenantId,
        name: createZoneDto.name,
        description: createZoneDto.description,
        displayOrder: createZoneDto.display_order ?? 0,
        isActive: createZoneDto.is_active ?? true,
      },
      include: {
        _count: {
          select: { tables: true },
        },
      },
    });

    this.logger.log(
      `Zone created: ${zone.id} (${zone.name}) for tenant ${tenantId}`,
    );

    return {
      id: zone.id,
      name: zone.name,
      description: zone.description,
      display_order: zone.displayOrder,
      is_active: zone.isActive,
      table_count: zone._count.tables,
      created_at: zone.createdAt,
      updated_at: zone.updatedAt,
    };
  }

  /**
   * Update a zone
   */
  async update(tenantId: string, id: string, updateZoneDto: UpdateZoneDto) {
    // Check if zone exists
    const existing = await this.prisma.zone.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException(t('zones.zoneNotFound', 'Zone not found'));
    }

    // Check for duplicate name if name is being updated
    if (updateZoneDto.name && updateZoneDto.name !== existing.name) {
      const duplicate = await this.prisma.zone.findFirst({
        where: {
          tenantId,
          name: updateZoneDto.name,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          t('zones.zoneNameExists', 'A zone with this name already exists'),
        );
      }
    }

    const zone = await this.prisma.zone.update({
      where: { id },
      data: {
        name: updateZoneDto.name,
        description: updateZoneDto.description,
        displayOrder: updateZoneDto.display_order,
        isActive: updateZoneDto.is_active,
      },
      include: {
        _count: {
          select: { tables: true },
        },
      },
    });

    this.logger.log(`Zone updated: ${zone.id} (${zone.name})`);

    return {
      id: zone.id,
      name: zone.name,
      description: zone.description,
      display_order: zone.displayOrder,
      is_active: zone.isActive,
      table_count: zone._count.tables,
      created_at: zone.createdAt,
      updated_at: zone.updatedAt,
    };
  }

  /**
   * Delete a zone
   */
  async remove(tenantId: string, id: string) {
    // Check if zone exists
    const existing = await this.prisma.zone.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        _count: {
          select: { tables: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(t('zones.zoneNotFound', 'Zone not found'));
    }

    // Check if zone has tables
    if (existing._count.tables > 0) {
      throw new ConflictException(
        t(
          'zones.zoneHasTables',
          `Cannot delete zone with ${existing._count.tables} tables assigned to it`,
          { args: { count: existing._count.tables } },
        ),
      );
    }

    await this.prisma.zone.delete({
      where: { id },
    });

    this.logger.log(`Zone deleted: ${id} (${existing.name})`);

    return {
      message: t('zones.zoneDeleted', 'Zone deleted successfully'),
    };
  }

  /**
   * Get zone statistics
   */
  async getStats(tenantId: string) {
    // Get zone stats grouped by isActive status in a single query
    const stats = await this.prisma.zone.groupBy({
      by: ['isActive'],
      where: { tenantId },
      _count: true,
    });

    // Calculate stats from grouped results
    const total = stats.reduce((sum, stat) => sum + stat._count, 0);
    const active = stats.find((stat) => stat.isActive)?._count || 0;
    const inactive = stats.find((stat) => !stat.isActive)?._count || 0;

    return {
      total,
      active,
      inactive,
    };
  }
}
