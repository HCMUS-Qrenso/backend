import { IsOptional, IsInt, Min, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryTenantsDto {
  @ApiPropertyOptional({
    description: 'Page number (default: 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page (default: 10)',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search by tenant name or slug',
    example: 'pizza',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by tenant status',
    example: 'active',
    enum: ['active', 'inactive', 'suspended'],
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by subscription tier',
    example: 'basic',
    enum: ['basic', 'premium', 'enterprise'],
  })
  @IsOptional()
  @IsIn(['basic', 'premium', 'enterprise'])
  subscription_tier?: string;

  @ApiPropertyOptional({
    example: 'name',
    description: 'Sort by field',
    enum: [
      'name',
      'slug',
      'status',
      'subscriptionTier',
      'createdAt',
      'updatedAt',
    ],
  })
  @IsOptional()
  @IsString()
  sort_by?: string = 'createdAt';

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Sort order',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_order?: 'asc' | 'desc' = 'desc';
}
