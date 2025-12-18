import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn, IsUUID, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ExportMenuDto {
  @ApiPropertyOptional({
    description: 'File format',
    enum: ['csv', 'xlsx'],
    default: 'csv',
  })
  @IsOptional()
  @IsIn(['csv', 'xlsx'])
  format?: 'csv' | 'xlsx';

  @ApiPropertyOptional({
    description: "Scope of export ('all' or 'category')",
    enum: ['all', 'category'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'category'])
  scope?: 'all' | 'category';

  @ApiPropertyOptional({
    description: 'Category ID (used when scope=category)',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Include images in export',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeImages?: boolean;

  @ApiPropertyOptional({
    description: 'Include modifiers in export',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeModifiers?: boolean;

  @ApiPropertyOptional({
    description: 'Include hidden items in export',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeHidden?: boolean;
}
