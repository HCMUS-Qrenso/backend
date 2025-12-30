import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  IsUUID,
  IsIn,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  READY = 'ready',
  SERVED = 'served',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  ABANDONED = 'abandoned',
}

export enum OrderPriority {
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  VIP = 'vip',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

export class QueryOrdersDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'ORD-1024',
    description: 'Search by order number',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: OrderStatus,
    example: OrderStatus.PENDING,
    description: 'Filter by order status',
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    enum: OrderPriority,
    example: OrderPriority.NORMAL,
    description: 'Filter by priority',
  })
  @IsOptional()
  @IsEnum(OrderPriority)
  priority?: OrderPriority;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    example: PaymentStatus.UNPAID,
    description: 'Filter by payment status',
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filter by table ID',
  })
  @IsOptional()
  @IsUUID()
  table_id?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filter by waiter ID',
  })
  @IsOptional()
  @IsUUID()
  waiter_id?: string;

  @ApiPropertyOptional({
    example: '2025-12-30',
    description: 'Filter orders from this date',
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    example: '2025-12-30',
    description: 'Filter orders until this date',
  })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Sort by field',
    enum: ['orderNumber', 'status', 'totalAmount', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString()
  sort_by?: string = 'createdAt';

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Sort order',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_order?: 'asc' | 'desc' = 'desc';
}
