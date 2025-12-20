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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateModifierDto {
  @ApiProperty({
    example: 'Lớn (Large)',
    description: 'Name of the modifier',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 15000,
    description: 'Price adjustment for this modifier',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  price_adjustment: number;

  @ApiProperty({
    example: true,
    description: 'Whether the modifier is available',
  })
  @IsBoolean()
  @Type(() => Boolean)
  is_available: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order for the modifier',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  display_order?: number;
}
