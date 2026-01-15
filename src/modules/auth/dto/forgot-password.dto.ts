import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ACCOUNT_TYPES } from '../../../common/constants';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address to send password reset link',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Account type to reset password for',
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
