import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class SetupPasswordDto {
  @ApiProperty({
    example: 'nguyen.van.a@restaurant.com',
    description: 'Email address of the invited staff',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'abc123xyz...',
    description: 'Invitation token from email link',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'MySecurePassword123!',
    description: 'New password to set (min 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}
