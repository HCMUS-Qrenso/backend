import { ApiProperty } from '@nestjs/swagger';
import { IsDecimal, IsObject, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class PositionUpdateDto {
  @ApiProperty({ example: 100, description: 'X coordinate on canvas' })
  @IsInt()
  x: number;

  @ApiProperty({ example: 200, description: 'Y coordinate on canvas' })
  @IsInt()
  y: number;

  @ApiProperty({ example: -45, description: 'Rotation angle in degrees' })
  @IsDecimal()
  rotation: number;
}

export class UpdatePositionDto {
  @ApiProperty({ type: PositionUpdateDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PositionUpdateDto)
  position: PositionUpdateDto;
}
