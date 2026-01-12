import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { VoucherStatus, VoucherKind } from '@prisma/client';

export class QueryVouchersDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search by code or name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: VoucherStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(VoucherStatus)
  status?: VoucherStatus;

  @ApiPropertyOptional({ enum: VoucherKind, description: 'Filter by kind' })
  @IsOptional()
  @IsEnum(VoucherKind)
  kind?: VoucherKind;

  @ApiPropertyOptional({ description: 'Filter by auto-apply flag' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  autoApply?: boolean;

  @ApiPropertyOptional({ description: 'Filter by public flag' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
