import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuItemDto {
  @ApiProperty({
    example: 'Margherita Pizza',
    description: 'Name of the menu item',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'Classic pizza with tomato sauce, mozzarella, and fresh basil',
    description: 'Detailed description of the menu item',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 15.99,
    description: 'Base price of the menu item',
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  base_price: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Preparation time in minutes',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  preparation_time?: number;

  @ApiPropertyOptional({
    example: 'available',
    description: 'Status of the menu item',
    enum: ['available', 'unavailable'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this item is a chef recommendation',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_chef_recommendation?: boolean;

  @ApiPropertyOptional({
    example: 'Contains gluten, dairy',
    description: 'Allergen information for the menu item',
  })
  @IsOptional()
  @IsString()
  allergen_info?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the category this menu item belongs to',
  })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional({
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    description: 'Array of image URLs for the menu item',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_urls?: string[];

  @ApiPropertyOptional({
    example: {
      fat: 10,
      carbs: 30,
      protein: 15,
      calories: 300,
    },
    description: 'Nutritional information for the menu item',
  })
  @IsOptional()
  nutritional_info?: {
    fat?: number;
    carbs?: number;
    protein?: number;
    calories?: number;
  };

  @ApiPropertyOptional({
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
    description: 'Array of modifier group IDs associated with the menu item',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  modifier_group_ids?: string[];
}
