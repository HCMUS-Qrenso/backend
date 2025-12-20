import { IsArray, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ModifierOrderDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Modifier UUID',
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

export class ReorderModifiersDto {
  @ApiProperty({
    type: [ModifierOrderDto],
    description: 'Array of modifier IDs with new display orders',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModifierOrderDto)
  modifiers: ModifierOrderDto[];
}
