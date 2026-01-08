import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsStrongPassword,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description:
      'Current password for verification. Must include uppercase, lowercase, number, and special character.',
    example: 'CurrentPass@123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  @IsStrongPassword()
  currentPassword: string;

  @ApiProperty({
    description:
      'New password (8-255 characters). Must include uppercase, lowercase, number, and special character.',
    example: 'NewSecurePass@123!',
    minLength: 8,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  @IsStrongPassword()
  newPassword: string;
}
