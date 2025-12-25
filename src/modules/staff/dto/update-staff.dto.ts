import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class UpdateStaffDto {
  @ApiPropertyOptional({
    example: 'Nguyễn Văn B',
    description: 'Full name of the staff member',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({
    example: '+84 999 888 777',
    description: 'Phone number of the staff member',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: 'inactive',
    description: 'Status of the staff member',
    enum: ['active', 'inactive', 'suspended'],
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: 'active' | 'inactive' | 'suspended';
}
