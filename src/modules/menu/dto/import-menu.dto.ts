import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsArray } from 'class-validator';

export class ImportMenuDto {
  @ApiProperty({
    description: 'Import mode',
    enum: ['create', 'update', 'upsert'],
    default: 'create',
  })
  @IsIn(['create', 'update', 'upsert'])
  mode: 'create' | 'update' | 'upsert';

  @ApiPropertyOptional({
    description: 'Data types to import (e.g., items, categories, modifiers)',
    type: 'array',
    items: { type: 'string' },
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dataTypes?: string[];

  // For Swagger UI to show file upload
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'CSV or XLSX file',
  })
  file: any;
}
