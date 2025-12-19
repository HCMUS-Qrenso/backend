import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ImportMenuDto {
  @ApiProperty({
    description: 'Import mode',
    enum: ['create', 'update', 'upsert'],
    default: 'create',
  })
  @IsIn(['create', 'update', 'upsert'])
  mode: 'create' | 'update' | 'upsert';
}
