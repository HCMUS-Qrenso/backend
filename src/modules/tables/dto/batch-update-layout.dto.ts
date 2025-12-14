import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsUUID, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class PositionDataDto {
  @ApiProperty({ example: 100 })
  @IsInt()
  x: number;

  @ApiProperty({ example: 200 })
  @IsInt()
  y: number;
}

class TableUpdateDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Table ID',
  })
  @IsUUID()
  table_id: string;

  @ApiProperty({ type: PositionDataDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PositionDataDto)
  position: PositionDataDto;
}

export class BatchUpdateLayoutDto {
  @ApiProperty({
    type: [TableUpdateDto],
    description: 'Array of table position updates',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableUpdateDto)
  updates: TableUpdateDto[];
}
