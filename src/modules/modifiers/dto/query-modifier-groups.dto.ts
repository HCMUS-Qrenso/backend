import {
  IsOptional,
  IsInt,
  IsString,
  IsBoolean,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryModifierGroupsDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 50,
    description: 'Number of items per page',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({
    example: 'size',
    description: 'Search by modifier group name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'display_order',
    description: 'Sort by field',
    enum: ['name', 'display_order', 'created_at', 'updated_at'],
    default: 'display_order',
  })
  @IsOptional()
  @IsIn(['name', 'display_order', 'created_at', 'updated_at'])
  sort_by?: 'name' | 'display_order' | 'created_at' | 'updated_at' =
    'display_order';

  @ApiPropertyOptional({
    example: 'asc',
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_order?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({
    example: true,
    description: 'Include usage count (used by menu items)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  include_usage_count?: boolean = true;
}
