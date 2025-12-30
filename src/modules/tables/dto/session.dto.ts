import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for starting a new table session
 * Used when customer clicks "Start Ordering" after scanning QR
 */
export class StartSessionDto {
  @ApiPropertyOptional({
    example: 'vi',
    description: 'Preferred language for the session',
    enum: ['vi', 'en', 'ja', 'ko', 'zh'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['vi', 'en', 'ja', 'ko', 'zh'])
  preferred_language?: string = 'vi';

  @ApiPropertyOptional({
    example: 2,
    description: 'Number of guests in the party',
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  party_size?: number = 1;

  @ApiPropertyOptional({
    example: 'Nguyen Van A',
    description: 'Guest name (optional)',
  })
  @IsOptional()
  @IsString()
  guest_name?: string;
}

/**
 * DTO for validating an existing session
 */
export class ValidateSessionDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Session token to validate',
  })
  @IsString()
  session_token: string;
}
