import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TableStatus } from './create-table.dto';

export class QueryTablesDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'Table 1',
    description: 'Search by table number or floor/area name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'Tầng 1',
    description: 'Filter by floor/area',
  })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional({
    enum: TableStatus,
    example: TableStatus.AVAILABLE,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by active status',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_active?: boolean;
}
