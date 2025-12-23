import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsIn,
  MaxLength,
} from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Full name of the staff member',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  fullName: string;

  @ApiProperty({
    example: 'nguyen.van.a@restaurant.com',
    description: 'Email address of the staff member',
    maxLength: 255,
  })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({
    example: '+84 912 345 678',
    description: 'Phone number of the staff member',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    example: 'waiter',
    description: 'Role of the staff member',
    enum: ['waiter', 'kitchen_staff'],
  })
  @IsIn(['waiter', 'kitchen_staff'])
  role: 'waiter' | 'kitchen_staff';
}
