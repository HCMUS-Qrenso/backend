import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';

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
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filter by zone ID',
  })
  @IsOptional()
  @IsUUID()
  zone_id?: string;
}
