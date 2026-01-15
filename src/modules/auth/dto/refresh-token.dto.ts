import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ACCOUNT_TYPES } from '../../../common/constants';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Account type for the refresh token',
    enum: Object.values(ACCOUNT_TYPES),
    example: ACCOUNT_TYPES.CUSTOMER,
    default: ACCOUNT_TYPES.CUSTOMER,
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(Object.values(ACCOUNT_TYPES))
  accountType?: string = ACCOUNT_TYPES.CUSTOMER;
}
