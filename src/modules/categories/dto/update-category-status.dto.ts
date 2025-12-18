import { IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryStatusDto {
  @ApiProperty({
    example: false,
    description: 'Whether the category is active',
  })
  @IsBoolean()
  @Type(() => Boolean)
  is_active: boolean;
}
