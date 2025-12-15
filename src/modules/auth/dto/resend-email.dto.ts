import { IsEmail, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
