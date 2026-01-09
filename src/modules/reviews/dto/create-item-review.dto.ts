import { IsString, IsInt, Min, Max, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateItemReviewDto {
  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Menu item ID to review',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  menuItemId: string;

  @ApiProperty({
    description: 'Rating from 1 to 5',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Review comment',
    example: 'Great dish! Highly recommended.',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
