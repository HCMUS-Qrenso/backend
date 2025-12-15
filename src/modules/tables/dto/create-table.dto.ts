import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
  Min,
  Max,
  MaxLength,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PositionDto {
  @ApiProperty({ example: 100, description: 'X coordinate on canvas' })
  @IsInt()
  x: number;

  @ApiProperty({ example: 200, description: 'Y coordinate on canvas' })
  @IsInt()
  y: number;
}

export enum TableShape {
  CIRCLE = 'circle',
  RECTANGLE = 'rectangle',
  OVAL = 'oval',
}

export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
}

export class CreateTableDto {
  @ApiProperty({
    example: 'VIP-01',
    description: 'Unique table number/identifier',
    maxLength: 20,
  })
  @IsString()
  @MaxLength(20)
  table_number: string;

  @ApiProperty({
    example: 4,
    description: 'Number of seats at the table',
    minimum: 1,
    maximum: 50,
  })
  @IsInt()
  @Min(1)
  @Max(50)
  capacity: number;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Zone ID where the table is located',
  })
  @IsUUID()
  zone_id: string;

  @ApiProperty({
    enum: TableShape,
    example: TableShape.RECTANGLE,
    description: 'Shape of the table',
  })
  @IsEnum(TableShape)
  shape: TableShape;

  @ApiPropertyOptional({
    enum: TableStatus,
    example: TableStatus.AVAILABLE,
    description: 'Current status of the table',
    default: TableStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the table is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Position and layout information',
    type: PositionDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PositionDto)
  position?: PositionDto;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether to automatically generate QR code',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  auto_generate_qr?: boolean;
}
