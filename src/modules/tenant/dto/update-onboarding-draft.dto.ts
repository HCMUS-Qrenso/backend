import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Onboarding draft settings DTO
 * All fields are optional as onboarding is progressive
 */

// Step 1: Restaurant Profile
class RestaurantDraftDto {
  @ApiPropertyOptional({ example: 'Phở Hà Nội' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Huệ, Q1, HCM' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'https://storage.example.com/restaurant.jpg',
  })
  @IsOptional()
  @IsString()
  image?: string;
}

// Step 2: Locale & Format
class LocaleDraftDto {
  @ApiPropertyOptional({ example: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '₫' })
  @IsOptional()
  @IsString()
  currency_symbol?: string;

  @ApiPropertyOptional({ example: 'Asia/Ho_Chi_Minh' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'DD/MM/YYYY' })
  @IsOptional()
  @IsString()
  date_format?: string;

  @ApiPropertyOptional({ example: 'vi' })
  @IsOptional()
  @IsString()
  language?: string;
}

// Step 3: Tax & Service Charge
class TaxChargeDraftDto {
  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tax_rate?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  tax_inclusive?: boolean;

  @ApiPropertyOptional({ example: 'VAT' })
  @IsOptional()
  @IsString()
  tax_label?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  service_charge_enabled?: boolean;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  service_charge_rate?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  service_charge_taxable?: boolean;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsNumber()
  service_charge_min_party?: number | null;
}

// Step 4: Operating Hours (JSON structure)
class OperatingHoursDraftDto {
  @ApiPropertyOptional()
  @IsOptional()
  operating_hours?: Record<string, any>;
}

// Step 5: Order Rules
class OrderRulesDraftDto {
  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsNumber()
  min_value?: number | null;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  estimated_prep_time?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allow_special_instructions?: boolean;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber()
  session_timeout_minutes?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  require_guest_count?: boolean;
}

// Step 6: Payment (PayOS)
class PaymentDraftDto {
  @ApiPropertyOptional({ example: 'client_xxx' })
  @IsOptional()
  @IsString()
  payos_client_id?: string | null;

  @ApiPropertyOptional({ example: 'api_xxx' })
  @IsOptional()
  @IsString()
  payos_api_key?: string | null;

  @ApiPropertyOptional({ example: 'checksum_xxx' })
  @IsOptional()
  @IsString()
  payos_checksum_key?: string | null;
}

/**
 * Main onboarding draft DTO
 */
export class UpdateOnboardingDraftDto {
  @ApiPropertyOptional({ description: 'Current step (1-7)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  current_step?: number;

  @ApiPropertyOptional({ description: 'Array of completed step numbers' })
  @IsOptional()
  completed_steps?: number[];

  @ApiPropertyOptional({ type: RestaurantDraftDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RestaurantDraftDto)
  restaurant?: RestaurantDraftDto;

  @ApiPropertyOptional({ type: LocaleDraftDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocaleDraftDto)
  locale?: LocaleDraftDto;

  @ApiPropertyOptional({ type: TaxChargeDraftDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaxChargeDraftDto)
  tax_charge?: TaxChargeDraftDto;

  @ApiPropertyOptional({ type: OperatingHoursDraftDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OperatingHoursDraftDto)
  hours?: OperatingHoursDraftDto;

  @ApiPropertyOptional({ type: OrderRulesDraftDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderRulesDraftDto)
  order_rules?: OrderRulesDraftDto;

  @ApiPropertyOptional({ type: PaymentDraftDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDraftDto)
  payment?: PaymentDraftDto;
}
