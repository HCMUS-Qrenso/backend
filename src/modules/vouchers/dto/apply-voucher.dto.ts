import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplySource } from '@prisma/client';

export class ApplyVoucherDto {
  @ApiProperty({ description: 'Voucher ID to apply' })
  @IsString()
  voucherId: string;

  @ApiPropertyOptional({
    description: 'Notes (e.g., "Thẻ sinh viên ĐH Bách Khoa")',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApplyVoucherCodeDto {
  @ApiProperty({
    description: 'Voucher or promo code',
    example: 'KHAITRUONG2026',
  })
  @IsString()
  code: string;
}

export class RevokeVoucherDto {
  @ApiProperty({ description: 'Reason for revoking' })
  @IsString()
  reason: string;
}
