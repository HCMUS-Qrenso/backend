import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { VoucherStatus, VoucherKind, DiscountType } from '@prisma/client';

export class CreateVoucherDto {
  @ApiProperty({
    description: 'Unique voucher code',
    example: 'KHAITRUONG2026',
  })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Display name', example: 'Giảm giá khai trương' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: VoucherKind, description: 'Voucher type' })
  @IsEnum(VoucherKind)
  kind: VoucherKind;

  @ApiProperty({ enum: DiscountType, description: 'Discount type' })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiPropertyOptional({ description: 'Percentage off (0-100)', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @ValidateIf((o) => o.discountType === DiscountType.percent)
  percentOff?: number;

  @ApiPropertyOptional({ description: 'Fixed amount off', example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @ValidateIf((o) => o.discountType === DiscountType.fixed_amount)
  amountOff?: number;

  @ApiPropertyOptional({ description: 'Max discount amount (for percentage)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ description: 'Minimum order subtotal required' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSubtotal?: number;

  @ApiPropertyOptional({ description: 'Minimum guest count required' })
  @IsOptional()
  @IsInt()
  @Min(1)
  minParty?: number;

  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ description: 'Total redemption limit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptionsTotal?: number;

  @ApiPropertyOptional({ description: 'Per-customer redemption limit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptionsPerCustomer?: number;

  @ApiPropertyOptional({
    description: 'Auto-apply for eligible orders',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;

  @ApiPropertyOptional({
    description: 'Show in customer frontend',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Priority (higher = applied first)',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({
    enum: VoucherStatus,
    description: 'Initial status',
    default: 'draft',
  })
  @IsOptional()
  @IsEnum(VoucherStatus)
  status?: VoucherStatus;
}
