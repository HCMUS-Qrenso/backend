import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password (6-255 characters)',
    example: 'SecurePass123!',
    minLength: 6,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(255)
  password: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  fullName: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+84901234567',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'User role (customer, admin, etc.)',
    example: 'customer',
    default: 'customer',
  })
  @IsString()
  @IsOptional()
  role?: string;
}
