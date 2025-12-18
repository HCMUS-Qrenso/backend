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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiHeader,
} from '@nestjs/swagger';
import { MenuService } from './menu.service';
import {
  CreateMenuItemDto,
  UpdateMenuItemDto,
  QueryMenuItemsDto,
  ImportMenuDto,
  ExportMenuDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles, TenantContext } from '../../common/decorators';
import { ROLES } from '../../common/constants';
import {
  QrTokenGuard,
  RolesGuard,
  TenantOwnershipGuard,
} from '../../common/guards';

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
  @Roles(
    ROLES.OWNER,
    ROLES.ADMIN,
    ROLES.WAITER,
    ROLES.KITCHEN,
    ROLES.CUSTOMER,
    ROLES.GUEST,
  )
  @UseGuards(QrTokenGuard) // Ensure GUEST/CUSTOMER have table context
  @ApiOperation({ summary: 'Get paginated list of menu items' })
  @ApiHeader({
    name: 'x-qr-token',
    required: false,
    description: 'QR token for CUSTOMER roles to establish table context',
  })
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

  // ============================================
  // Import / Export (placed before dynamic :id route to ensure route matching)
  // ============================================

  @Post('import')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import menu data from CSV/XLSX' })
  @ApiResponse({ status: 200, description: 'Import completed with summary' })
  @ApiResponse({
    status: 400,
    description: 'Bad request or file missing/invalid',
  })
  @ApiConsumes('multipart/form-data')
  async importData(
    @TenantContext('id') tenantId: string,
    @UploadedFile() file: Express.Request['file'],
    @Body() importDto: ImportMenuDto,
  ) {
    const { mode } = importDto as any;
    return this.menuService.import(tenantId, file as any, mode || 'create');
  }

  @Get('export')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Export menu data as CSV/XLSX' })
  @ApiResponse({ status: 200, description: 'File returned as attachment' })
  async exportData(
    @TenantContext('id') tenantId: string,
    @Query() exportDto: ExportMenuDto,
  ) {
    const format = String(exportDto.format || 'csv').toLowerCase();
    const scope = String(exportDto.scope || 'all');

    // If scope==category, categoryId must be provided and be a valid UUID (validated by DTO), otherwise reject
    if (scope === 'category' && !exportDto.categoryId) {
      throw new BadRequestException(
        'categoryId is required when scope=category',
      );
    }

    const opts = {
      format,
      scope,
      categoryId: exportDto.categoryId || undefined,
      includeImages:
        String(exportDto.includeImages) === 'true' ||
        exportDto.includeImages === true,
      includeModifiers:
        String(exportDto.includeModifiers) === 'true' ||
        exportDto.includeModifiers === true,
      includeHidden:
        String(exportDto.includeHidden) === 'true' ||
        exportDto.includeHidden === true,
    } as any;

    return this.menuService.export(tenantId, opts);
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
