import {
  IsString,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateModifierDto {
  @ApiPropertyOptional({
    example: 'Extra Large',
    description: 'Name of the modifier',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 25000,
    description: 'Price adjustment for this modifier',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  price_adjustment?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the modifier is available',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_available?: boolean;

  @ApiPropertyOptional({
    example: 4,
    description: 'Display order for the modifier',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  display_order?: number;
}
