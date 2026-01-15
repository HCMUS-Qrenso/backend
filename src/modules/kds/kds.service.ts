import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { QueryKdsOrdersDto, KdsItemStatus } from './dto';

// Active order statuses for KDS (excluding completed/cancelled/abandoned)
const KDS_ACTIVE_ORDER_STATUSES = [
  'pending',
  'accepted',
  'in_progress',
  'ready',
  'served',
];

// Active item statuses for KDS
const KDS_ACTIVE_ITEM_STATUSES: KdsItemStatus[] = [
  KdsItemStatus.PENDING,
  KdsItemStatus.ACCEPTED,
  KdsItemStatus.PREPARING,
  KdsItemStatus.READY,
];

@Injectable()
export class KdsService {
  private readonly logger = new Logger(KdsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get orders optimized for KDS display
   * - Only active orders (not completed/cancelled/abandoned)
   * - Includes items with active statuses
   * - Sorted by priority algorithm
   * - Includes joined data (table, zone, waiter, menu item)
   */
  async getKdsOrders(tenantId: string, query: QueryKdsOrdersDto) {
    const { search, item_statuses, priorities } = query;

    this.logger.log(`KDS getOrders called - tenantId: ${tenantId}`);

    // Build where clause
    const where: any = {
      tenantId,
      status: { in: KDS_ACTIVE_ORDER_STATUSES },
    };

    // Filter by priority
    if (priorities && priorities.length > 0) {
      where.priority = { in: priorities };
    }

    // Search by order number or table number
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { table: { tableNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Fetch orders with related data
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            zone: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        waiter: {
          select: {
            id: true,
            fullName: true,
          },
        },
        items: {
          // Don't filter items here - fetch all items to show complete orders
          // Filtering should be done at display level if needed
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                preparationTime: true,
                allergenInfo: true,
              },
            },
            modifiers: {
              include: {
                modifier: {
                  select: {
                    id: true,
                    name: true,
                    priceAdjustment: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: [
        // Priority sorting: vip > urgent > high > normal
        // This is handled in the response mapping for more control
        { createdAt: 'asc' },
      ],
    });

    this.logger.log(
      `KDS: Found ${orders.length} orders with status in [${KDS_ACTIVE_ORDER_STATUSES.join(', ')}]`,
    );

    if (orders.length > 0) {
      this.logger.log(
        `KDS: First order: id=${orders[0].id}, status=${orders[0].status}, items=${orders[0].items?.length || 0}`,
      );
    }

    // For KDS, we want orders that have at least one item to process
    // But we show all items regardless of status
    const filteredOrders = orders.filter((order) => order.items.length > 0);

    this.logger.log(
      `KDS: After filtering orders with items: ${filteredOrders.length} orders`,
    );

    // Sort by priority algorithm
    const sortedOrders = this.sortByPriority(filteredOrders);

    // Transform to KDS response format
    const kdsOrders = sortedOrders.map((order) =>
      this.transformToKdsOrder(order),
    );

    // Calculate stats
    const stats = this.calculateStats(filteredOrders);

    return {
      success: true,
      data: {
        orders: kdsOrders,
      },
      meta: stats,
    };
  }

  /**
   * Sort orders by KDS priority algorithm
   * 1. Priority Level (VIP > Urgent > High > Normal)
   * 2. Elapsed Time (older orders first - prevent starvation)
   * 3. Quick items first (for throughput)
   */
  private sortByPriority(orders: any[]): any[] {
    const priorityWeight: Record<string, number> = {
      vip: 1,
      urgent: 2,
      high: 3,
      normal: 4,
    };

    const now = Date.now();
    const threshold = 20 * 60 * 1000; // 20 minutes

    return [...orders].sort((a, b) => {
      // 1. Priority Level
      const priorityDiff =
        (priorityWeight[a.priority] || 4) - (priorityWeight[b.priority] || 4);
      if (priorityDiff !== 0) return priorityDiff;

      // 2. Elapsed Time (starvation prevention)
      const aElapsed = now - new Date(a.createdAt).getTime();
      const bElapsed = now - new Date(b.createdAt).getTime();

      if (aElapsed > threshold || bElapsed > threshold) {
        return bElapsed - aElapsed; // Older first
      }

      // 3. Quick items first
      const aMaxPrep = Math.max(
        ...a.items.map((i: any) => i.menuItem?.preparationTime || 15),
      );
      const bMaxPrep = Math.max(
        ...b.items.map((i: any) => i.menuItem?.preparationTime || 15),
      );
      return aMaxPrep - bMaxPrep;
    });
  }

  /**
   * Transform Prisma order to KDS response format
   */
  private transformToKdsOrder(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      tableId: order.tableId,
      tableNumber: order.table?.tableNumber || 'N/A',
      zoneName: order.table?.zone?.name || null,
      waiterId: order.waiterId,
      waiterName: order.waiter?.fullName || null,
      status: order.status,
      priority: order.priority,
      specialInstructions: order.specialInstructions,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item: any) => ({
        id: item.id,
        orderId: item.orderId,
        menuItemId: item.menuItemId,
        menuItemName: item.menuItem?.name || 'Unknown',
        quantity: item.quantity,
        status: item.status,
        specialInstructions: item.specialInstructions,
        estimatedPrepTime: item.menuItem?.preparationTime || null,
        preparationStartedAt: item.preparationStartedAt,
        preparationCompletedAt: item.preparationCompletedAt,
        servedAt: item.servedAt,
        cancellationReason: item.cancellationReason,
        allergenInfo: item.menuItem?.allergenInfo || null,
        modifiers: item.modifiers.map((mod: any) => ({
          id: mod.id,
          modifierName: mod.modifier?.name || mod.modifierName,
          priceAdjustment: Number(mod.priceAdjustment),
        })),
        createdAt: item.createdAt,
      })),
    };
  }

  /**
   * Calculate KDS stats
   */
  private calculateStats(orders: any[]) {
    const now = Date.now();

    const overdueCount = orders.filter((order) => {
      const elapsed = (now - new Date(order.createdAt).getTime()) / 60000;
      const maxPrepTime = Math.max(
        ...order.items.map((i: any) => i.menuItem?.preparationTime || 15),
      );
      return elapsed > maxPrepTime * 1.5;
    }).length;

    return {
      total: orders.length,
      activeCount: orders.length,
      overdueCount,
    };
  }
}
