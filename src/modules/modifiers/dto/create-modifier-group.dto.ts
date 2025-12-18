import {
  IsString,
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateModifierGroupDto {
  @ApiProperty({
    example: 'Kích cỡ (Size)',
    description: 'Name of the modifier group',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'single_choice',
    description: 'Type of modifier group',
    enum: ['single_choice', 'multiple_choice'],
  })
  @IsString()
  @IsIn(['single_choice', 'multiple_choice'])
  type: 'single_choice' | 'multiple_choice';

  @ApiProperty({
    example: true,
    description: 'Whether selection is required',
  })
  @IsBoolean()
  @Type(() => Boolean)
  is_required: boolean;

  @ApiPropertyOptional({
    example: 0,
    description: 'Minimum number of selections',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  min_selections?: number = 0;

  @ApiPropertyOptional({
    example: 3,
    description: 'Maximum number of selections (null for unlimited)',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  max_selections?: number | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order for the modifier group',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  display_order?: number;
}
