import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus, OrderPriority } from './query-orders.dto';

/**
 * DTO for updating order status
 * Used by waiter/admin when accepting, rejecting, or updating order status
 */
export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.ACCEPTED,
    description: 'New status for the order',
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({
    example: 'Kitchen is too busy right now',
    description: 'Reason for rejection (required when status is REJECTED)',
  })
  @IsOptional()
  @IsString()
  rejection_reason?: string;

  @ApiPropertyOptional({
    example: 'Status updated by manager',
    description: 'Notes for this status change',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for updating order priority
 */
export class UpdateOrderPriorityDto {
  @ApiProperty({
    enum: OrderPriority,
    example: OrderPriority.URGENT,
    description: 'New priority for the order',
  })
  @IsEnum(OrderPriority)
  priority: OrderPriority;
}

/**
 * DTO for assigning waiter to order
 */
export class AssignWaiterDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the waiter to assign',
  })
  @IsString()
  waiter_id: string;
}
