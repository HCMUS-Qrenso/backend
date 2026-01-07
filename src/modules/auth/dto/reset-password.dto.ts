import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsIn,
  MinLength,
  MaxLength,
  IsStrongPassword,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ACCOUNT_TYPES } from '../../../common/constants';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token from email',
    example: 'abc123def456ghi789',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

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

  @ApiProperty({
    description: 'Account type for password reset',
    enum: Object.values(ACCOUNT_TYPES),
    example: ACCOUNT_TYPES.CUSTOMER,
    default: ACCOUNT_TYPES.CUSTOMER,
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(Object.values(ACCOUNT_TYPES))
  accountType?: string = ACCOUNT_TYPES.CUSTOMER;
}
