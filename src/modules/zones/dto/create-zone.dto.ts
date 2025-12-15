import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsInt,
  IsOptional,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateZoneDto {
  @ApiProperty({
    example: 'Tầng 1',
    description: 'Name of the zone',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Main dining area on the first floor',
    description: 'Description of the zone',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order for sorting zones',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the zone is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
