import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for a single modifier selection when creating an order item
 */
export class OrderItemModifierDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the modifier',
  })
  @IsUUID()
  modifier_id: string;
}

/**
 * DTO for a single item when creating an order
 */
export class CreateOrderItemDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the menu item',
  })
  @IsUUID()
  menu_item_id: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity of the item',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    type: [OrderItemModifierDto],
    description: 'Selected modifiers for this item',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemModifierDto)
  modifiers?: OrderItemModifierDto[];

  @ApiPropertyOptional({
    example: 'No onions, extra cheese',
    description: 'Special instructions for this item',
  })
  @IsOptional()
  @IsString()
  special_instructions?: string;
}

/**
 * DTO for creating a new order
 * Used by customer when placing an order from customer-frontend
 * 
 * Note: If table session already has an active order, items will be appended
 * to the existing order instead of creating a new one (single order per session pattern)
 */
export class CreateOrderDto {
  @ApiProperty({
    type: [CreateOrderItemDto],
    description: 'List of items to order',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Order must contain at least one item' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({
    example: 'Please serve drinks first',
    description: 'Special instructions for the entire order',
  })
  @IsOptional()
  @IsString()
  special_instructions?: string;

  @ApiPropertyOptional({
    example: 'device_abc123',
    description: 'Device identifier for multi-device tracking (auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  device_id?: string;
}

/**
 * DTO for adding items to an existing order
 */
export class AddOrderItemsDto {
  @ApiProperty({
    type: [CreateOrderItemDto],
    description: 'List of items to add to the order',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Must add at least one item' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
