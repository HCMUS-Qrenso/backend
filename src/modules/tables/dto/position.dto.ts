import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsInt } from 'class-validator';

export class PositionDto {
  @ApiProperty({ example: 100, description: 'X coordinate on canvas' })
  @IsInt()
  x: number;

  @ApiProperty({ example: 200, description: 'Y coordinate on canvas' })
  @IsInt()
  y: number;

  @ApiProperty({ example: -45, description: 'Rotation angle in degrees' })
  @IsNumber({ maxDecimalPlaces: 2 })
  rotation: number;
}
