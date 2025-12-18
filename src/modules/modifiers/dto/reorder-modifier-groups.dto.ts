import { IsArray, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ModifierGroupOrderDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Modifier group UUID',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    example: 1,
    description: 'Display order',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  display_order: number;
}

export class ReorderModifierGroupsDto {
  @ApiProperty({
    type: [ModifierGroupOrderDto],
    description: 'Array of modifier group IDs with new display orders',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModifierGroupOrderDto)
  modifier_groups: ModifierGroupOrderDto[];
}
