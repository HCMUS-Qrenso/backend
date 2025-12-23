import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { StaffService } from './staff.service';
import {
  CreateStaffDto,
  UpdateStaffDto,
  UpdateStatusDto,
  QueryStaffDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { Roles, TenantContext } from '../../common/decorators';
import { RolesGuard, TenantOwnershipGuard } from '../../common/guards';
import { ROLES } from '../../common/constants';

@ApiTags('staff')
@Controller('staff')
@UseGuards(JwtAuthGuard, TenantOwnershipGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  // ============================================
  // Staff List & Statistics
  // ============================================

  @Get()
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Get paginated list of staff with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of staff members',
  })
  async findAll(
    @TenantContext() tenantId: string,
    @Query() query: QueryStaffDto,
  ) {
    return this.staffService.findAll(tenantId, query);
  }

  @Get('stats')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Get staff statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns staff statistics by role and status',
  })
  async getStats(@TenantContext() tenantId: string) {
    return this.staffService.getStats(tenantId);
  }

  // ============================================
  // Staff CRUD Operations
  // ============================================

  @Get(':id')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Get staff member by ID' })
  @ApiParam({ name: 'id', description: 'Staff ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Returns staff member details',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff not found',
  })
  async findOne(@TenantContext() tenantId: string, @Param('id') id: string) {
    return this.staffService.findOne(tenantId, id);
  }

  @Post()
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create/invite a new staff member' })
  @ApiResponse({
    status: 201,
    description: 'Staff member created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  async create(
    @TenantContext() tenantId: string,
    @Body() createStaffDto: CreateStaffDto,
  ) {
    return this.staffService.create(tenantId, createStaffDto);
  }

  @Put(':id')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Update staff member' })
  @ApiParam({ name: 'id', description: 'Staff ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Staff member updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff not found',
  })
  async update(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() updateStaffDto: UpdateStaffDto,
  ) {
    return this.staffService.update(tenantId, id, updateStaffDto);
  }

  @Delete(':id')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete staff member' })
  @ApiParam({ name: 'id', description: 'Staff ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Staff member deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete staff with active orders',
  })
  async remove(@TenantContext() tenantId: string, @Param('id') id: string) {
    return this.staffService.remove(tenantId, id);
  }

  // ============================================
  // Staff Status & Actions
  // ============================================

  @Patch(':id/status')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Update staff status only' })
  @ApiParam({ name: 'id', description: 'Staff ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Staff status updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff not found',
  })
  async updateStatus(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.staffService.updateStatus(tenantId, id, updateStatusDto);
  }

  @Post(':id/reset-password')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset email to staff' })
  @ApiParam({ name: 'id', description: 'Staff ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff not found',
  })
  async resetPassword(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.staffService.resetPassword(tenantId, id);
  }

  @Post(':id/resend-invite')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend invite email to staff' })
  @ApiParam({ name: 'id', description: 'Staff ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Invite email resent successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Staff already verified their email',
  })
  async resendInvite(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.staffService.resendInvite(tenantId, id);
  }
}
