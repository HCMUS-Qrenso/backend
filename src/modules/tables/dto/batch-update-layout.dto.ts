import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsUUID, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { PositionDto } from './position.dto';

class TableUpdateDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Table ID',
  })
  @IsUUID()
  table_id: string;

  @ApiProperty({ type: PositionDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PositionDto)
  position: PositionDto;
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
