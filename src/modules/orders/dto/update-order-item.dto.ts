import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Order Item Status - Individual item lifecycle
 */
export enum OrderItemStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
}

/**
 * DTO for updating a single order item's status
 * Used by kitchen staff when preparing items
 */
export class UpdateOrderItemStatusDto {
  @ApiProperty({
    enum: OrderItemStatus,
    example: OrderItemStatus.PREPARING,
    description: 'New status for the order item',
  })
  @IsEnum(OrderItemStatus)
  status: OrderItemStatus;

  @ApiPropertyOptional({
    example: 'Item out of stock',
    description: 'Reason for cancellation (required when status is CANCELLED)',
  })
  @IsOptional()
  @IsString()
  cancellation_reason?: string;
}

/**
 * DTO for batch updating multiple order items' status
 */
export class BatchUpdateOrderItemStatusDto {
  @ApiProperty({
    type: [String],
    description: 'List of order item IDs to update',
  })
  @IsUUID('4', { each: true })
  item_ids: string[];

  @ApiProperty({
    enum: OrderItemStatus,
    example: OrderItemStatus.READY,
    description: 'New status for all items',
  })
  @IsEnum(OrderItemStatus)
  status: OrderItemStatus;
}
