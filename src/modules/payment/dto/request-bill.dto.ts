import { IsNotEmpty, IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestBillDto {
  @ApiProperty({
    description: 'Order ID to request bill for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({
    description: 'Additional notes from customer',
    example: 'Please bring the bill to table',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
