import { ApiProperty } from '@nestjs/swagger';
import { IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PositionDto } from './position.dto';

export class UpdatePositionDto {
  @ApiProperty({ type: PositionDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PositionDto)
  position: PositionDto;
}
