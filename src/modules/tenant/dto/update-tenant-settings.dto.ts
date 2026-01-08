import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsEmail,
  Min,
  Max,
  MaxLength,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * DTO for updating tenant settings
 * All fields are optional - partial updates are supported
 */
export class UpdateTenantSettingsDto {
  // ========== GENERAL SETTINGS ==========

  @ApiPropertyOptional({
    description: 'Currency code (e.g., VND, USD)',
    example: 'VND',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Currency symbol (e.g., ₫, $)',
    example: '₫',
    maxLength: 5,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  currencySymbol?: string;

  @ApiPropertyOptional({
    description: 'Timezone (e.g., Asia/Ho_Chi_Minh)',
    example: 'Asia/Ho_Chi_Minh',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Date format (e.g., DD/MM/YYYY)',
    example: 'DD/MM/YYYY',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dateFormat?: string;

  @ApiPropertyOptional({
    description: 'Default language code',
    example: 'vi',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+84123456789',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'contact@restaurant.com',
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  // ========== TAX SETTINGS ==========

  @ApiPropertyOptional({
    description: 'Tax rate percentage (0-100)',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({
    description: 'Whether prices are tax-inclusive',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  taxInclusive?: boolean;

  @ApiPropertyOptional({
    description: 'Tax label displayed on receipts',
    example: 'VAT',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxLabel?: string;

  // ========== SERVICE CHARGE SETTINGS ==========

  @ApiPropertyOptional({
    description: 'Enable service charge',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  serviceChargeEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Service charge rate percentage (0-100)',
    example: 5,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  serviceChargeRate?: number;

  @ApiPropertyOptional({
    description: 'Whether service charge is taxable',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  serviceChargeTaxable?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum party size for service charge to apply',
    example: 6,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  serviceChargeMinParty?: number;

  // ========== OPERATING HOURS ==========

  @ApiPropertyOptional({
    description: 'Operating hours configuration (JSON)',
    example: {
      monday: { isOpen: true, slots: [{ open: '09:00', close: '22:00' }] },
      tuesday: { isOpen: true, slots: [{ open: '09:00', close: '22:00' }] },
      wednesday: { isOpen: true, slots: [{ open: '09:00', close: '22:00' }] },
      thursday: { isOpen: true, slots: [{ open: '09:00', close: '22:00' }] },
      friday: { isOpen: true, slots: [{ open: '09:00', close: '23:00' }] },
      saturday: { isOpen: true, slots: [{ open: '09:00', close: '23:00' }] },
      sunday: { isOpen: false, slots: [] },
    },
  })
  @IsOptional()
  @IsObject()
  operatingHours?: Record<string, unknown>;

  // ========== ORDER SETTINGS ==========

  @ApiPropertyOptional({
    description: 'Minimum order value',
    example: 50000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minOrderValue?: number;

  @ApiPropertyOptional({
    description: 'Estimated preparation time in minutes',
    example: 15,
    minimum: 1,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(180)
  estimatedPrepTime?: number;

  @ApiPropertyOptional({
    description: 'Allow special instructions on orders',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  allowSpecialInstructions?: boolean;

  @ApiPropertyOptional({
    description: 'Session timeout in minutes',
    example: 120,
    minimum: 15,
    maximum: 480,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(15)
  @Max(480)
  sessionTimeoutMinutes?: number;

  @ApiPropertyOptional({
    description: 'Require guest count when starting session',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  requireGuestCount?: boolean;

  // ========== NOTIFICATION SETTINGS ==========

  @ApiPropertyOptional({
    description: 'Enable notification sounds',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  notifySoundEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable email notifications',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  notifyEmailEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Email address for notifications',
    example: 'orders@restaurant.com',
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  notifyEmail?: string;

  // ========== RECEIPT SETTINGS ==========

  @ApiPropertyOptional({
    description: 'Receipt header text',
    example: 'Thank you for dining with us!',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptHeader?: string;

  @ApiPropertyOptional({
    description: 'Receipt footer text',
    example: 'Please visit us again!',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptFooter?: string;

  @ApiPropertyOptional({
    description: 'Show logo on receipt',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  receiptShowLogo?: boolean;

  @ApiPropertyOptional({
    description: 'Invoice number prefix',
    example: 'QR-',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  invoicePrefix?: string;
}
