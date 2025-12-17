import {
  IsString,
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateModifierGroupDto {
  @ApiPropertyOptional({
    example: 'Kích cỡ mới',
    description: 'Name of the modifier group',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'single_choice',
    description: 'Type of modifier group',
    enum: ['single_choice', 'multiple_choice'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['single_choice', 'multiple_choice'])
  type?: 'single_choice' | 'multiple_choice';

  @ApiPropertyOptional({
    example: true,
    description: 'Whether selection is required',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_required?: boolean;

  @ApiPropertyOptional({
    example: 0,
    description: 'Minimum number of selections',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  min_selections?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Maximum number of selections (null for unlimited)',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  max_selections?: number | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order for the modifier group',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  display_order?: number;
}
