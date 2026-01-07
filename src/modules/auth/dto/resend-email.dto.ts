import { IsEmail, IsNotEmpty, IsEnum, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ACCOUNT_TYPES } from '../../../common/constants';

export enum ResendEmailType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}

export class ResendEmailDto {
  @ApiProperty({
    description: 'Email address to resend verification/reset email',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Type of verification email to resend',
    enum: ResendEmailType,
    example: ResendEmailType.EMAIL_VERIFICATION,
  })
  @IsEnum(ResendEmailType)
  @IsNotEmpty()
  type: ResendEmailType;

  @ApiProperty({
    description: 'Account type to resend email for',
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
