import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum TableStatusEnum {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
}

export class UpdateTableStatusDto {
  @ApiProperty({
    enum: TableStatusEnum,
    example: TableStatusEnum.AVAILABLE,
    description: 'New status for the table',
  })
  @IsEnum(TableStatusEnum)
  status: TableStatusEnum;
}
