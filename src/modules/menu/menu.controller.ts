import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { MenuService } from './menu.service';
import { CreateMenuItemDto, UpdateMenuItemDto, QueryMenuItemsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { Roles, TenantContext } from '../../common/decorators';
import { ROLES } from '../../common/constants';
import { RolesGuard, TenantOwnershipGuard } from '../../common/guards';

@ApiTags('menu')
@Controller('menu')
@UseGuards(JwtAuthGuard, TenantOwnershipGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ============================================
  // Menu Items List & Statistics
  // ============================================

  @Get()
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN, ROLES.CUSTOMER)
  @ApiOperation({ summary: 'Get paginated list of menu items' })
  @ApiResponse({
    status: 200,
    description: 'Menu items retrieved successfully',
  })
  async findAll(
    @TenantContext('id') tenantId: string,
    @Query() query: QueryMenuItemsDto,
  ) {
    return this.menuService.findAll(tenantId, query);
  }

  @Get('stats')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
  @ApiOperation({ summary: 'Get menu statistics' })
  @ApiResponse({
    status: 200,
    description: 'Menu statistics retrieved successfully',
  })
  async getStats(@TenantContext('id') tenantId: string) {
    return this.menuService.getStats(tenantId);
  }

  // ============================================
  // Menu Item CRUD Operations
  // ============================================

  @Post()
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new menu item' })
  @ApiResponse({ status: 201, description: 'Menu item created successfully' })
  @ApiResponse({ status: 409, description: 'Menu item name already exists' })
  async create(
    @TenantContext('id') tenantId: string,
    @Body() createMenuItemDto: CreateMenuItemDto,
  ) {
    return this.menuService.create(tenantId, createMenuItemDto);
  }

  @Get(':id')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN, ROLES.CUSTOMER)
  @ApiOperation({ summary: 'Get menu item by ID' })
  @ApiResponse({ status: 200, description: 'Menu item retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  async findOne(
    @TenantContext('id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.menuService.findOne(tenantId, id);
  }

  @Put(':id')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Update menu item' })
  @ApiResponse({ status: 200, description: 'Menu item updated successfully' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  @ApiResponse({ status: 409, description: 'Menu item name already exists' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  async update(
    @TenantContext('id') tenantId: string,
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.menuService.update(tenantId, id, updateMenuItemDto);
  }

  @Delete(':id')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete menu item' })
  @ApiResponse({ status: 200, description: 'Menu item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete menu item with active orders',
  })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  async remove(@TenantContext('id') tenantId: string, @Param('id') id: string) {
    return this.menuService.remove(tenantId, id);
  }
}
