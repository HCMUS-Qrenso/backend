import { PartialType } from '@nestjs/swagger';
import { CreateVoucherDto } from './create-voucher.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VoucherStatus } from '@prisma/client';

export class UpdateVoucherDto extends PartialType(CreateVoucherDto) {
  @ApiPropertyOptional({ enum: VoucherStatus, description: 'Update status' })
  @IsOptional()
  @IsEnum(VoucherStatus)
  status?: VoucherStatus;
}
