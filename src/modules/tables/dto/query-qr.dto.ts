import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum QrStatus {
  READY = 'ready',
  MISSING = 'missing',
  OUTDATED = 'outdated',
}

export class QueryQrDto {
  @ApiPropertyOptional({
    enum: QrStatus,
    example: QrStatus.READY,
    description: 'Filter by QR code status',
  })
  @IsOptional()
  @IsEnum(QrStatus)
  status?: QrStatus;

  @ApiPropertyOptional({
    example: 'Tầng 1',
    description: 'Filter by floor/area',
  })
  @IsOptional()
  @IsString()
  floor?: string;
}
