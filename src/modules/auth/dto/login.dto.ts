import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  IsStrongPassword,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description:
      'User password (minimum 8 characters). Must include uppercase, lowercase, number, and special character.',
    example: 'Password@123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  @IsStrongPassword()
  password: string;

  @ApiProperty({
    description:
      'Whether to remember the user for extended session (7 days vs session cookie)',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean = true;
}
