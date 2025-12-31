import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateStaffStatusDto {
  @ApiProperty({
    example: 'suspended',
    description: 'New status for the staff member',
    enum: ['active', 'inactive', 'suspended'],
  })
  @IsIn(['active', 'inactive', 'suspended'])
  status: 'active' | 'inactive' | 'suspended';
}
