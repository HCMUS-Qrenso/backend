import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Order Item Status for KDS filtering
 */
export enum KdsItemStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PREPARING = 'preparing',
  READY = 'ready',
}

/**
 * Order Priority for KDS filtering
 */
export enum KdsPriority {
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  VIP = 'vip',
}

/**
 * DTO for querying KDS orders
 * Optimized for kitchen display system with sensible defaults
 */
export class QueryKdsOrdersDto {
  @ApiPropertyOptional({
    example: 'ORD-1024',
    description: 'Search by order number or table number',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: KdsItemStatus,
    isArray: true,
    example: [KdsItemStatus.PENDING, KdsItemStatus.PREPARING],
    description: 'Filter by item statuses (orders containing items with these statuses)',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(KdsItemStatus, { each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  item_statuses?: KdsItemStatus[];

  @ApiPropertyOptional({
    enum: KdsPriority,
    isArray: true,
    example: [KdsPriority.VIP, KdsPriority.URGENT],
    description: 'Filter by order priorities',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(KdsPriority, { each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  priorities?: KdsPriority[];
}
