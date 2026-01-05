import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  QueryPerformanceDto,
  QueryTopItemsDto,
  QueryRecentOrdersDto,
} from './dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get today's KPI stats
   */
  async getTodayStats(tenantId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    // Orders today
    const ordersToday = await this.prisma.order.aggregate({
      where: {
        tenantId,
        createdAt: { gte: startOfToday },
        status: { notIn: ['cancelled', 'rejected', 'abandoned'] },
      },
      _count: true,
      _sum: { totalAmount: true },
    });

    // Orders yesterday
    const ordersYesterday = await this.prisma.order.aggregate({
      where: {
        tenantId,
        createdAt: { gte: startOfYesterday, lt: startOfToday },
        status: { notIn: ['cancelled', 'rejected', 'abandoned'] },
      },
      _count: true,
      _sum: { totalAmount: true },
    });

    // Order status breakdown
    const statusBreakdown = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        tenantId,
        createdAt: { gte: startOfToday },
      },
      _count: true,
    });

    // Tables status
    const tablesStatus = await this.prisma.table.groupBy({
      by: ['status'],
      where: { tenantId, isActive: true },
      _count: true,
    });

    // Average service time (from accepted to served)
    const completedOrders = await this.prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: startOfToday },
        status: { in: ['served', 'completed'] },
        acceptedAt: { not: null },
      },
      select: { acceptedAt: true, updatedAt: true },
    });

    let avgServiceTime = 0;
    if (completedOrders.length > 0) {
      const totalTime = completedOrders.reduce((sum, order) => {
        if (order.acceptedAt) {
          return sum + (order.updatedAt.getTime() - order.acceptedAt.getTime());
        }
        return sum;
      }, 0);
      avgServiceTime = Math.round(totalTime / completedOrders.length / 60000); // minutes
    }

    // Calculate values
    const ordersTodayCount = ordersToday._count || 0;
    const ordersYesterdayCount = ordersYesterday._count || 0;
    const revenueTodayValue = Number(ordersToday._sum.totalAmount || 0);
    const revenueYesterdayValue = Number(ordersYesterday._sum.totalAmount || 0);

    const ordersChangePercent = ordersYesterdayCount > 0
      ? Math.round(((ordersTodayCount - ordersYesterdayCount) / ordersYesterdayCount) * 100)
      : 0;
    const revenueChangePercent = revenueYesterdayValue > 0
      ? Math.round(((revenueTodayValue - revenueYesterdayValue) / revenueYesterdayValue) * 100)
      : 0;
    const avgOrderValue = ordersTodayCount > 0
      ? Math.round(revenueTodayValue / ordersTodayCount)
      : 0;

    // Parse status breakdown
    const statusMap: Record<string, number> = {};
    statusBreakdown.forEach((s) => {
      statusMap[s.status] = s._count;
    });

    // Parse tables status
    let tablesOccupied = 0;
    let tablesAvailable = 0;
    let tablesTotal = 0;
    tablesStatus.forEach((t) => {
      tablesTotal += t._count;
      if (t.status === 'occupied') tablesOccupied = t._count;
      if (t.status === 'available') tablesAvailable = t._count;
    });

    return {
      success: true,
      data: {
        orders_today: ordersTodayCount,
        orders_yesterday: ordersYesterdayCount,
        orders_change_percent: ordersChangePercent,
        revenue_today: revenueTodayValue,
        revenue_yesterday: revenueYesterdayValue,
        revenue_change_percent: revenueChangePercent,
        avg_order_value: avgOrderValue,
        tables_occupied: tablesOccupied,
        tables_available: tablesAvailable,
        tables_total: tablesTotal,
        avg_service_time_minutes: avgServiceTime,
        order_status_breakdown: {
          pending: statusMap['pending'] || 0,
          accepted: statusMap['accepted'] || 0,
          in_progress: statusMap['in_progress'] || 0,
          preparing: statusMap['preparing'] || 0,
          ready: statusMap['ready'] || 0,
          served: statusMap['served'] || 0,
          completed: statusMap['completed'] || 0,
        },
      },
    };
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(tenantId: string, query: QueryRecentOrdersDto) {
    const { limit = 7 } = query;

    const orders = await this.prisma.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        table: { select: { tableNumber: true } },
      },
    });

    return {
      success: true,
      data: {
        orders: orders.map((order) => ({
          id: order.id,
          order_number: order.orderNumber,
          table_number: order.table?.tableNumber || 'N/A',
          created_at: order.createdAt.toISOString(),
          total_amount: Number(order.totalAmount),
          status: order.status,
        })),
      },
    };
  }

  /**
   * Get performance data for chart
   */
  async getPerformance(tenantId: string, query: QueryPerformanceDto) {
    const { range = 'day', limit = 11 } = query;
    const now = new Date();

    let startDate: Date;
    let groupBy: string;
    let dateFormat: string;

    switch (range) {
      case 'week':
        startDate = new Date(now.getTime() - limit * 7 * 24 * 60 * 60 * 1000);
        groupBy = "DATE_TRUNC('week', created_at)";
        dateFormat = "'Tuần ' || TO_CHAR(DATE_TRUNC('week', created_at), 'IW')";
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - limit + 1, 1);
        groupBy = "DATE_TRUNC('month', created_at)";
        dateFormat = "'Tháng ' || TO_CHAR(DATE_TRUNC('month', created_at), 'MM')";
        break;
      default: // day
        startDate = new Date(now.getTime() - limit * 24 * 60 * 60 * 1000);
        groupBy = "DATE(created_at)";
        dateFormat = "TO_CHAR(DATE(created_at), 'DD/MM')";
    }

    // Raw SQL for better aggregation
    const data = await this.prisma.$queryRawUnsafe<
      Array<{ date: string; revenue: number; orders: number }>
    >(`
      SELECT 
        ${dateFormat} as date,
        COALESCE(SUM(total_amount), 0)::float as revenue,
        COUNT(*)::int as orders
      FROM orders
      WHERE tenant_id = $1
        AND created_at >= $2
        AND status NOT IN ('cancelled', 'rejected', 'abandoned')
      GROUP BY ${groupBy}
      ORDER BY ${groupBy} ASC
      LIMIT $3
    `, tenantId, startDate, limit);

    // Calculate summary
    const totalRevenue = data.reduce((sum, d) => sum + Number(d.revenue), 0);
    const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);
    const avgOrdersPerPeriod = data.length > 0 ? Math.round(totalOrders / data.length) : 0;

    // Calculate growth (compare first half vs second half)
    let growthPercentage = 0;
    if (data.length >= 2) {
      const midpoint = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, midpoint).reduce((sum, d) => sum + Number(d.revenue), 0);
      const secondHalf = data.slice(midpoint).reduce((sum, d) => sum + Number(d.revenue), 0);
      if (firstHalf > 0) {
        growthPercentage = Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
      }
    }

    return {
      success: true,
      data: {
        data: data.map((d) => ({
          date: d.date,
          revenue: Number(d.revenue),
          orders: d.orders,
        })),
        summary: {
          total_revenue: totalRevenue,
          total_orders: totalOrders,
          growth_percentage: growthPercentage,
          avg_orders_per_period: avgOrdersPerPeriod,
        },
      },
    };
  }

  /**
   * Get top selling items
   */
  async getTopItems(tenantId: string, query: QueryTopItemsDto) {
    const { limit = 6, date } = query;

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Aggregate order items grouped by menu item
    const topItems = await this.prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: {
          tenantId,
          createdAt: { gte: startOfDay, lt: endOfDay },
          status: { notIn: ['cancelled', 'rejected', 'abandoned'] },
        },
        status: { notIn: ['cancelled', 'returned'] },
      },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    // Fetch menu item details
    const menuItemIds = topItems.map((item) => item.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { imageUrl: true },
        },
      },
    });

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    return {
      success: true,
      data: {
        items: topItems.map((item) => {
          const menuItem = menuItemMap.get(item.menuItemId);
          return {
            id: item.menuItemId,
            name: menuItem?.name || 'Unknown',
            image_url: menuItem?.images?.[0]?.imageUrl || null,
            quantity_sold: item._sum.quantity || 0,
            revenue: Number(item._sum.subtotal || 0),
          };
        }),
      },
    };
  }
}
