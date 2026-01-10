import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  QueryVouchersDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard, TenantOwnershipGuard, QrTokenGuard } from '../../common/guards';
import { Roles, TenantContext, CurrentUser } from '../../common/decorators';

@ApiTags('Vouchers')
@Controller('vouchers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  // ============================================
  // ADMIN CRUD ENDPOINTS
  // ============================================

  @Post()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create a new voucher' })
  @ApiResponse({ status: 201, description: 'Voucher created successfully' })
  async create(
    @TenantContext('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVoucherDto,
  ) {
    return this.vouchersService.create(tenantId, dto, userId);
  }

  @Get()
  @Roles('admin', 'owner', 'manager')
  @ApiOperation({ summary: 'List all vouchers with filters' })
  @ApiResponse({ status: 200, description: 'Vouchers retrieved successfully' })
  async findAll(
    @TenantContext('tenantId') tenantId: string,
    @Query() query: QueryVouchersDto,
  ) {
    return this.vouchersService.findAll(tenantId, query);
  }

  @Get('staff-available')
  @Roles('admin', 'owner', 'manager', 'waiter')
  @ApiOperation({ summary: 'Get staff-only vouchers for manual application' })
  @ApiResponse({ status: 200, description: 'Staff vouchers retrieved' })
  async getStaffVouchers(@TenantContext('tenantId') tenantId: string) {
    return this.vouchersService.getStaffVouchers(tenantId);
  }

  @Get(':id')
  @Roles('admin', 'owner', 'manager')
  @ApiOperation({ summary: 'Get voucher details' })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, description: 'Voucher retrieved successfully' })
  async findOne(
    @TenantContext('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.vouchersService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Update a voucher' })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, description: 'Voucher updated successfully' })
  async update(
    @TenantContext('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVoucherDto,
  ) {
    return this.vouchersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Archive a voucher' })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, description: 'Voucher archived successfully' })
  async archive(
    @TenantContext('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.vouchersService.archive(tenantId, id);
  }

  @Get(':id/redemptions')
  @Roles('admin', 'owner', 'manager')
  @ApiOperation({ summary: 'Get voucher redemption history' })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, description: 'Redemptions retrieved' })
  async getRedemptions(
    @TenantContext('tenantId') tenantId: string,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.vouchersService.getRedemptions(tenantId, id, page, limit);
  }
}

// ============================================
// Customer Vouchers Controller (Public access)
// ============================================

@ApiTags('Customer Vouchers')
@Controller('customer/vouchers')
export class CustomerVouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get('available')
  @UseGuards(QrTokenGuard)
  @ApiOperation({ summary: 'Get available public vouchers for tenant' })
  @ApiResponse({ status: 200, description: 'Public vouchers retrieved' })
  async getPublicVouchers(
    @TenantContext('tenantId') tenantId: string,
    @Req() request: any,
  ) {
    const tableSessionId = request.qrContext?.tableSessionId;
    return this.vouchersService.getPublicVouchers(tenantId, tableSessionId);
  }
}
