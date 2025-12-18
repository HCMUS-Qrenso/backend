import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { ModifiersService } from './modifiers.service';
import {
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  QueryModifierGroupsDto,
  ReorderModifierGroupsDto,
  CreateModifierDto,
  UpdateModifierDto,
  ReorderModifiersDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { Roles, TenantContext } from '../../common/decorators';
import { ROLES } from '../../common/constants';
import {
  RolesGuard,
  TenantOwnershipGuard,
  QrTokenGuard,
} from '../../common/guards';

@ApiTags('modifiers')
@Controller()
@UseGuards(JwtAuthGuard, TenantOwnershipGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ModifiersController {
  constructor(private readonly modifiersService: ModifiersService) {}

  // ============================================
  // MODIFIER GROUPS
  // ============================================

  @Get('modifier-groups')
  @Roles(
    ROLES.OWNER,
    ROLES.ADMIN,
    ROLES.WAITER,
    ROLES.KITCHEN,
    ROLES.CUSTOMER,
    ROLES.GUEST,
  )
  @UseGuards(QrTokenGuard) // Ensure GUEST/CUSTOMER have table context
  @ApiOperation({ summary: 'Get paginated list of modifier groups' })
  @ApiHeader({
    name: 'x-qr-token',
    required: false,
    description: 'QR token for CUSTOMER roles to establish table context',
  })
  @ApiResponse({
    status: 200,
    description: 'Modifier groups retrieved successfully',
  })
  async findAllGroups(
    @TenantContext('id') tenantId: string,
    @Query() query: QueryModifierGroupsDto,
  ) {
    return this.modifiersService.findAllGroups(tenantId, query);
  }

  @Get('modifier-groups/:group_id')
  @Roles(
    ROLES.OWNER,
    ROLES.ADMIN,
    ROLES.WAITER,
    ROLES.KITCHEN,
    ROLES.CUSTOMER,
    ROLES.GUEST,
  )
  @UseGuards(QrTokenGuard) // Ensure GUEST/CUSTOMER have table context
  @ApiOperation({ summary: 'Get modifier group by ID with its modifiers' })
  @ApiHeader({
    name: 'x-qr-token',
    required: false,
    description: 'QR token for CUSTOMER roles to establish table context',
  })
  @ApiParam({ name: 'group_id', description: 'Modifier group ID' })
  @ApiQuery({
    name: 'include_modifiers',
    required: false,
    type: Boolean,
    description: 'Include modifiers list',
  })
  @ApiResponse({
    status: 200,
    description: 'Modifier group retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Modifier group not found',
  })
  async findOneGroup(
    @TenantContext('id') tenantId: string,
    @Param('group_id') groupId: string,
    @Query('include_modifiers', new ParseBoolPipe({ optional: true }))
    includeModifiers?: boolean,
  ) {
    return this.modifiersService.findOneGroup(
      tenantId,
      groupId,
      includeModifiers ?? true,
    );
  }

  @Post('modifier-groups')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new modifier group' })
  @ApiResponse({
    status: 201,
    description: 'Modifier group created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Modifier group name already exists',
  })
  async createGroup(
    @TenantContext('id') tenantId: string,
    @Body() createDto: CreateModifierGroupDto,
  ) {
    return this.modifiersService.createGroup(tenantId, createDto);
  }

  @Patch('modifier-groups/:group_id')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Update modifier group' })
  @ApiParam({ name: 'group_id', description: 'Modifier group ID' })
  @ApiResponse({
    status: 200,
    description: 'Modifier group updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Modifier group not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Modifier group name already exists',
  })
  async updateGroup(
    @TenantContext('id') tenantId: string,
    @Param('group_id') groupId: string,
    @Body() updateDto: UpdateModifierGroupDto,
  ) {
    return this.modifiersService.updateGroup(tenantId, groupId, updateDto);
  }

  @Put('modifier-groups/reorder')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({
    summary: 'Update display order for multiple modifier groups',
  })
  @ApiResponse({
    status: 200,
    description: 'Modifier groups reordered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body or duplicate orders',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more modifier groups not found',
  })
  async reorderGroups(
    @TenantContext('id') tenantId: string,
    @Body() reorderDto: ReorderModifierGroupsDto,
  ) {
    return this.modifiersService.reorderGroups(tenantId, reorderDto);
  }

  @Delete('modifier-groups/:group_id')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Delete modifier group' })
  @ApiParam({ name: 'group_id', description: 'Modifier group ID' })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'Force delete even if group is used by menu items',
  })
  @ApiResponse({
    status: 200,
    description: 'Modifier group deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Modifier group not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete modifier group used by menu items',
  })
  async removeGroup(
    @TenantContext('id') tenantId: string,
    @Param('group_id') groupId: string,
    @Query('force', new ParseBoolPipe({ optional: true })) force?: boolean,
  ) {
    return this.modifiersService.removeGroup(tenantId, groupId, force || false);
  }

  // ============================================
  // MODIFIERS
  // ============================================

  @Get('modifier-groups/:group_id/modifiers')
  @Roles(
    ROLES.OWNER,
    ROLES.ADMIN,
    ROLES.WAITER,
    ROLES.KITCHEN,
    ROLES.CUSTOMER,
    ROLES.GUEST,
  )
  @UseGuards(QrTokenGuard) // Ensure GUEST/CUSTOMER have table context
  @ApiOperation({ summary: 'Get modifiers for a specific modifier group' })
  @ApiHeader({
    name: 'x-qr-token',
    required: false,
    description: 'QR token for CUSTOMER roles to establish table context',
  })
  @ApiParam({ name: 'group_id', description: 'Modifier group ID' })
  @ApiQuery({
    name: 'include_unavailable',
    required: false,
    type: Boolean,
    description: 'Include unavailable modifiers',
  })
  @ApiQuery({
    name: 'sort_by',
    required: false,
    enum: ['name', 'display_order', 'price_adjustment', 'created_at'],
    description: 'Sort by field',
  })
  @ApiQuery({
    name: 'sort_order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
  })
  @ApiResponse({
    status: 200,
    description: 'Modifiers retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Modifier group not found',
  })
  async findAllModifiers(
    @TenantContext('id') tenantId: string,
    @Param('group_id') groupId: string,
    @Query('include_unavailable', new ParseBoolPipe({ optional: true }))
    includeUnavailable?: boolean,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: 'asc' | 'desc',
  ) {
    return this.modifiersService.findAllModifiers(
      tenantId,
      groupId,
      includeUnavailable ?? true,
      sortBy || 'display_order',
      sortOrder || 'asc',
    );
  }

  @Post('modifier-groups/:group_id/modifiers')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new modifier in a modifier group' })
  @ApiParam({ name: 'group_id', description: 'Modifier group ID' })
  @ApiResponse({
    status: 201,
    description: 'Modifier created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Modifier group not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Modifier name already exists in this group',
  })
  async createModifier(
    @TenantContext('id') tenantId: string,
    @Param('group_id') groupId: string,
    @Body() createDto: CreateModifierDto,
  ) {
    return this.modifiersService.createModifier(tenantId, groupId, createDto);
  }

  @Patch('modifiers/:modifier_id')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Update modifier' })
  @ApiParam({ name: 'modifier_id', description: 'Modifier ID' })
  @ApiResponse({
    status: 200,
    description: 'Modifier updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Modifier not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Modifier name already exists in this group',
  })
  async updateModifier(
    @TenantContext('id') tenantId: string,
    @Param('modifier_id') modifierId: string,
    @Body() updateDto: UpdateModifierDto,
  ) {
    return this.modifiersService.updateModifier(
      tenantId,
      modifierId,
      updateDto,
    );
  }

  @Put('modifier-groups/:group_id/modifiers/reorder')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({
    summary: 'Update display order for modifiers within a group',
  })
  @ApiParam({ name: 'group_id', description: 'Modifier group ID' })
  @ApiResponse({
    status: 200,
    description: 'Modifiers reordered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body or duplicate orders',
  })
  @ApiResponse({
    status: 404,
    description: 'Modifier group or one or more modifiers not found',
  })
  async reorderModifiers(
    @TenantContext('id') tenantId: string,
    @Param('group_id') groupId: string,
    @Body() reorderDto: ReorderModifiersDto,
  ) {
    return this.modifiersService.reorderModifiers(
      tenantId,
      groupId,
      reorderDto,
    );
  }

  @Delete('modifiers/:modifier_id')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Delete modifier' })
  @ApiParam({ name: 'modifier_id', description: 'Modifier ID' })
  @ApiResponse({
    status: 200,
    description: 'Modifier deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Modifier not found',
  })
  async removeModifier(
    @TenantContext('id') tenantId: string,
    @Param('modifier_id') modifierId: string,
  ) {
    return this.modifiersService.removeModifier(tenantId, modifierId);
  }
}
