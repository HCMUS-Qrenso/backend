import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  QueryPerformanceDto,
  QueryTopItemsDto,
  QueryRecentOrdersDto,
  TodayStatsResponseDto,
  RecentOrdersResponseDto,
  PerformanceResponseDto,
  TopItemsResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard } from '../../common/guards';
import { Roles, TenantContext } from '../../common/decorators';
import { ROLES } from '../../common/constants';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('today-stats')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
  @ApiOperation({ summary: "Get today's KPI statistics" })
  @ApiResponse({ status: 200, type: TodayStatsResponseDto })
  async getTodayStats(@TenantContext() tenantId: string) {
    return this.dashboardService.getTodayStats(tenantId);
  }

  @Get('recent-orders')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER)
  @ApiOperation({ summary: 'Get recent orders' })
  @ApiResponse({ status: 200, type: RecentOrdersResponseDto })
  async getRecentOrders(
    @TenantContext() tenantId: string,
    @Query() query: QueryRecentOrdersDto,
  ) {
    return this.dashboardService.getRecentOrders(tenantId, query);
  }

  @Get('performance')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Get performance data for chart' })
  @ApiResponse({ status: 200, type: PerformanceResponseDto })
  async getPerformance(
    @TenantContext() tenantId: string,
    @Query() query: QueryPerformanceDto,
  ) {
    return this.dashboardService.getPerformance(tenantId, query);
  }

  @Get('top-items')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
  @ApiOperation({ summary: 'Get top selling items' })
  @ApiResponse({ status: 200, type: TopItemsResponseDto })
  async getTopItems(
    @TenantContext() tenantId: string,
    @Query() query: QueryTopItemsDto,
  ) {
    return this.dashboardService.getTopItems(tenantId, query);
  }
}
