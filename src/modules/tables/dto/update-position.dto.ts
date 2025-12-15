import { ApiProperty } from '@nestjs/swagger';
import { IsObject, ValidateNested } from 'class-validator';
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

class PositionUpdateDto {
  @ApiProperty({ example: 100, description: 'X coordinate on canvas' })
  @IsInt()
  x: number;

  @ApiProperty({ example: 200, description: 'Y coordinate on canvas' })
  @IsInt()
  y: number;
}

export class UpdatePositionDto {
  @ApiProperty({ type: PositionUpdateDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PositionUpdateDto)
  position: PositionUpdateDto;
}
