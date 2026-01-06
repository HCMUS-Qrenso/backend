import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  IsUUID,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '../../../common/constants';
import type { PaymentMethodTypeValue } from '../../../common/constants';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Order ID to create payment for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Payment method type',
    enum: [PaymentMethodType.CASH, PaymentMethodType.QR],
    example: PaymentMethodType.QR,
  })
  @IsNotEmpty()
  @IsIn([PaymentMethodType.CASH, PaymentMethodType.QR])
  paymentMethod: PaymentMethodTypeValue;

  @ApiPropertyOptional({
    description: 'Description for the payment',
    example: 'Payment for Order #ORD-20260106-REST01-0001',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Return URL after successful payment',
    example: 'http://localhost:3002/payment/success',
  })
  @IsOptional()
  @IsString()
  returnUrl?: string;

  @ApiPropertyOptional({
    description: 'Cancel URL if payment is cancelled',
    example: 'http://localhost:3002/payment/cancel',
  })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class PaymentItemDto {
  @ApiProperty({
    description: 'Item name',
    example: 'Phở Bò',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Item quantity',
    example: 2,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Item price',
    example: 50000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;
}

export class CreatePaymentLinkDto {
  @ApiProperty({
    description: 'Order code (unique identifier)',
    example: 123456,
  })
  @IsNotEmpty()
  @IsNumber()
  orderCode: number;

  @ApiProperty({
    description: 'Total amount in VND',
    example: 100000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Description of the payment',
    example: 'Payment for Order #ORD-20260106-REST01-0001',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'List of items in the order',
    type: [PaymentItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items: PaymentItemDto[];

  @ApiPropertyOptional({
    description: 'Return URL after successful payment',
    example: 'http://localhost:3002/payment/success',
  })
  @IsOptional()
  @IsString()
  returnUrl?: string;

  @ApiPropertyOptional({
    description: 'Cancel URL if payment is cancelled',
    example: 'http://localhost:3002/payment/cancel',
  })
  @IsOptional()
  @IsString()
  cancelUrl?: string;

  @ApiPropertyOptional({
    description: 'Buyer name',
    example: 'Nguyen Van A',
  })
  @IsOptional()
  @IsString()
  buyerName?: string;

  @ApiPropertyOptional({
    description: 'Buyer email',
    example: 'customer@example.com',
  })
  @IsOptional()
  @IsString()
  buyerEmail?: string;

  @ApiPropertyOptional({
    description: 'Buyer phone',
    example: '0901234567',
  })
  @IsOptional()
  @IsString()
  buyerPhone?: string;

  @ApiPropertyOptional({
    description: 'Buyer address',
    example: '123 Nguyen Hue, District 1, HCMC',
  })
  @IsOptional()
  @IsString()
  buyerAddress?: string;
}
