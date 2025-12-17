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
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  QueryCategoriesDto,
  UpdateCategoryStatusDto,
  ReorderCategoriesDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { Roles, TenantContext } from '../../common/decorators';
import { ROLES } from '../../common/constants';
import { RolesGuard, TenantOwnershipGuard } from '../../common/guards';

@ApiTags('categories')
@Controller('categories')
@UseGuards(JwtAuthGuard, TenantOwnershipGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ============================================
  // Category Statistics
  // ============================================

  @Get('stats')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER)
  @ApiOperation({ summary: 'Get category statistics' })
  @ApiResponse({
    status: 200,
    description: 'Category statistics retrieved successfully',
  })
  async getStats(@TenantContext('id') tenantId: string) {
    return this.categoriesService.getStats(tenantId);
  }

  // ============================================
  // Category List
  // ============================================

  @Get()
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN, ROLES.CUSTOMER)
  @ApiOperation({ summary: 'Get paginated list of categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  async findAll(
    @TenantContext('id') tenantId: string,
    @Query() query: QueryCategoriesDto,
  ) {
    return this.categoriesService.findAll(tenantId, query);
  }

  // ============================================
  // Category CRUD Operations
  // ============================================

  @Post()
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Category name already exists',
  })
  async create(
    @TenantContext('id') tenantId: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(tenantId, createCategoryDto);
  }

  @Get(':id')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN, ROLES.CUSTOMER)
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiQuery({
    name: 'include_menu_items',
    required: false,
    type: Boolean,
    description: 'Include associated menu items',
  })
  @ApiQuery({
    name: 'include_item_count',
    required: false,
    type: Boolean,
    description: 'Include total count of menu items',
  })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async findOne(
    @TenantContext('id') tenantId: string,
    @Param('id') id: string,
    @Query('include_menu_items', new ParseBoolPipe({ optional: true }))
    includeMenuItems?: boolean,
    @Query('include_item_count', new ParseBoolPipe({ optional: true }))
    includeItemCount?: boolean,
  ) {
    return this.categoriesService.findOne(
      tenantId,
      id,
      includeMenuItems || false,
      includeItemCount ?? true,
    );
  }

  @Patch(':id')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Update category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Category name already exists',
  })
  async update(
    @TenantContext('id') tenantId: string,
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(tenantId, id, updateCategoryDto);
  }

  @Patch(':id/status')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Toggle category visibility' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category status updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async updateStatus(
    @TenantContext('id') tenantId: string,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateCategoryStatusDto,
  ) {
    return this.categoriesService.updateStatus(tenantId, id, updateStatusDto);
  }

  @Put('reorder')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Update display order for multiple categories' })
  @ApiResponse({
    status: 200,
    description: 'Category order updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body or duplicate orders',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more categories not found',
  })
  async reorder(
    @TenantContext('id') tenantId: string,
    @Body() reorderDto: ReorderCategoriesDto,
  ) {
    return this.categoriesService.reorder(tenantId, reorderDto);
  }

  @Delete(':id')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Delete category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'Force delete even if category has menu items',
  })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete category with associated menu items',
  })
  async remove(
    @TenantContext('id') tenantId: string,
    @Param('id') id: string,
    @Query('force', new ParseBoolPipe({ optional: true })) force?: boolean,
  ) {
    return this.categoriesService.remove(tenantId, id, force || false);
  }
}
