import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

// ============================================
// Query DTOs
// ============================================

export class QueryPerformanceDto {
  @ApiPropertyOptional({
    enum: ['day', 'week', 'month'],
    default: 'day',
    description: 'Time range for data aggregation',
  })
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  range?: 'day' | 'week' | 'month' = 'day';

  @ApiPropertyOptional({
    default: 11,
    description: 'Number of data points to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number = 11;
}

export class QueryTopItemsDto {
  @ApiPropertyOptional({
    default: 6,
    description: 'Number of top items to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 6;

  @ApiPropertyOptional({
    description:
      'Date to get top items for (YYYY-MM-DD format, defaults to today)',
  })
  @IsOptional()
  @IsString()
  date?: string;
}

export class QueryRecentOrdersDto {
  @ApiPropertyOptional({
    default: 7,
    description: 'Number of recent orders to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 7;
}

// ============================================
// Response DTOs
// ============================================

export class OrderStatusBreakdownDto {
  @ApiProperty() pending: number;
  @ApiProperty() accepted: number;
  @ApiProperty() in_progress: number;
  @ApiProperty() preparing: number;
  @ApiProperty() ready: number;
  @ApiProperty() served: number;
  @ApiProperty() completed: number;
}

export class TodayStatsResponseDto {
  @ApiProperty() success: boolean;
  @ApiProperty() data: {
    orders_today: number;
    orders_yesterday: number;
    orders_change_percent: number;
    revenue_today: number;
    revenue_yesterday: number;
    revenue_change_percent: number;
    avg_order_value: number;
    tables_occupied: number;
    tables_available: number;
    tables_total: number;
    avg_service_time_minutes: number;
    order_status_breakdown: OrderStatusBreakdownDto;
  };
}

export class RecentOrderDto {
  @ApiProperty() id: string;
  @ApiProperty() order_number: string;
  @ApiProperty() table_number: string;
  @ApiProperty() created_at: string;
  @ApiProperty() total_amount: number;
  @ApiProperty() status: string;
}

export class RecentOrdersResponseDto {
  @ApiProperty() success: boolean;
  @ApiProperty({ type: [RecentOrderDto] }) data: {
    orders: RecentOrderDto[];
  };
}

export class PerformanceDataPointDto {
  @ApiProperty() date: string;
  @ApiProperty() revenue: number;
  @ApiProperty() orders: number;
}

export class PerformanceSummaryDto {
  @ApiProperty() total_revenue: number;
  @ApiProperty() total_orders: number;
  @ApiProperty() growth_percentage: number;
  @ApiProperty() avg_orders_per_period: number;
}

export class PerformanceResponseDto {
  @ApiProperty() success: boolean;
  @ApiProperty() data: {
    data: PerformanceDataPointDto[];
    summary: PerformanceSummaryDto;
  };
}

export class TopItemDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() image_url: string | null;
  @ApiProperty() quantity_sold: number;
  @ApiProperty() revenue: number;
}

export class TopItemsResponseDto {
  @ApiProperty() success: boolean;
  @ApiProperty({ type: [TopItemDto] }) data: {
    items: TopItemDto[];
  };
}
