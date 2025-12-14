import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsArray, IsUUID } from 'class-validator';

export class GenerateQrDto {
  @ApiPropertyOptional({
    example: false,
    description: 'Whether to force regenerate existing QR codes',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force_regenerate?: boolean;
}

export class BatchGenerateQrDto {
  @ApiPropertyOptional({
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
    description:
      'Array of table IDs to generate QR codes for. If empty, generates for all active tables.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  table_ids?: string[];

  @ApiPropertyOptional({
    example: false,
    description: 'Whether to force regenerate existing QR codes',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force_regenerate?: boolean;
}
