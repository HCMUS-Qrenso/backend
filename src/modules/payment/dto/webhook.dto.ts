import {
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsBooleanString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class PayOSWebhookDto {
  @ApiProperty({
    description: 'Order code',
    example: 123456,
  })
  @IsNumber()
  orderCode: number;

  @ApiProperty({
    description: 'Payment amount',
    example: 100000,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Payment description',
    example: 'Payment for Order #ORD-20260106-REST01-0001',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Account number',
    example: '12345678',
  })
  @IsString()
  accountNumber: string;

  @ApiProperty({
    description: 'Reference code',
    example: 'FT21234567890',
  })
  @IsString()
  reference: string;

  @ApiProperty({
    description: 'Transaction date time',
    example: '2026-01-06T10:30:00+07:00',
  })
  @IsString()
  transactionDateTime: string;

  @ApiPropertyOptional({
    description: 'Virtual account name',
    example: 'NGUYEN VAN A',
  })
  @IsOptional()
  @IsString()
  virtualAccountName?: string;

  @ApiPropertyOptional({
    description: 'Virtual account number',
    example: '9704000000000001',
  })
  @IsOptional()
  @IsString()
  virtualAccountNumber?: string;

  @ApiProperty({
    description: 'Payment currency (VND)',
    example: 'VND',
  })
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'Payment link ID from PayOS',
    example: 'abc123def456',
  })
  @IsString()
  paymentLinkId: string;

  @ApiProperty({
    description: 'Payment status code',
    example: '00',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Payment status description',
    example: 'success',
  })
  @IsString()
  desc: string;

  @ApiPropertyOptional({
    description: 'Counter account bank ID',
    example: 'MB',
  })
  @IsOptional()
  @IsString()
  counterAccountBankId?: string;

  @ApiPropertyOptional({
    description: 'Counter account bank name',
    example: 'MB Bank',
  })
  @IsOptional()
  @IsString()
  counterAccountBankName?: string;

  @ApiPropertyOptional({
    description: 'Counter account name',
    example: 'NGUYEN VAN B',
  })
  @IsOptional()
  @IsString()
  counterAccountName?: string;

  @ApiPropertyOptional({
    description: 'Counter account number',
    example: '0123456789',
  })
  @IsOptional()
  @IsString()
  counterAccountNumber?: string;
}

export class WebhookDataDto {
  @ApiProperty({
    description: 'Response code',
    example: '00',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Response description',
    example: 'success',
  })
  @IsString()
  desc: string;

  @ApiPropertyOptional({
    description: 'Success flag',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @ApiProperty({
    type: PayOSWebhookDto,
  })
  @ValidateNested()
  @Type(() => PayOSWebhookDto)
  data: PayOSWebhookDto;

  @ApiProperty({
    description: 'Webhook signature for verification',
    example: '8d8640d802576397a1ce45ebda7f835055768ac7ad2e0bfb77f9b8f12cca4c7f',
  })
  @IsString()
  signature: string;
}
