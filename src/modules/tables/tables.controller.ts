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
  Req,
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
import { TablesService } from './tables.service';
import {
  CreateTableDto,
  UpdateTableDto,
  UpdateStatusDto,
  QueryTablesDto,
  UpdatePositionDto,
  BatchUpdateLayoutDto,
  GenerateQrDto,
  BatchGenerateQrDto,
  QueryQrDto,
  DownloadFormat,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { Roles, TenantContext } from '../../common/decorators';
import { ROLES } from 'src/common/constants';
import {
  QrTokenGuard,
  RolesGuard,
  TenantOwnershipGuard,
} from 'src/common/guards';

@ApiTags('tables')
@Controller('tables')
@UseGuards(JwtAuthGuard, TenantOwnershipGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  // ============================================
  // Tables List & Statistics
  // ============================================

  @Get()
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
  @ApiOperation({ summary: 'Get paginated list of tables with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of tables',
  })
  async findAll(
    @TenantContext() tenantId: string,
    @Query() query: QueryTablesDto,
  ) {
    return this.tablesService.findAll(tenantId, query);
  }

  @Get('stats')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
  @ApiOperation({ summary: 'Get table statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns table statistics',
  })
  async getStats(@TenantContext() tenantId: string) {
    return this.tablesService.getStats(tenantId);
  }

  // ============================================
  // Zone Plan Layout
  // ============================================

  @Get('layout')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
  @ApiOperation({ summary: 'Get layout by zone' })
  @ApiResponse({
    status: 200,
    description: 'Returns tables layout for a specific zone',
  })
  async getLayout(
    @TenantContext() tenantId: string,
    @Query('zone_id') zoneId: string,
  ) {
    return this.tablesService.getLayout(tenantId, zoneId);
  }

  @Get('zones')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
  @ApiOperation({ summary: 'Get available zones' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of available zones',
  })
  async getZones(@TenantContext() tenantId: string) {
    return this.tablesService.getZones(tenantId);
  }

  @Post('layout/batch-update')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Batch update table positions' })
  @ApiResponse({
    status: 200,
    description: 'Successfully updated table positions',
  })
  async batchUpdateLayout(
    @TenantContext() tenantId: string,
    @Body() batchUpdateDto: BatchUpdateLayoutDto,
  ) {
    return this.tablesService.batchUpdateLayout(tenantId, batchUpdateDto);
  }

  // ============================================
  // QR Code Management
  // ============================================

  @Get('qr')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER)
  @ApiOperation({ summary: 'Get all QR codes' })
  @ApiResponse({
    status: 200,
    description: 'Returns QR code information for all tables',
  })
  async getAllQrCodes(
    @TenantContext() tenantId: string,
    @Query() query: QueryQrDto,
  ) {
    return this.tablesService.getAllQrCodes(tenantId, query);
  }

  @Post('qr/batch-generate')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Batch generate QR codes' })
  @ApiResponse({
    status: 200,
    description: 'Successfully generated QR codes',
  })
  async batchGenerateQrCodes(
    @TenantContext() tenantId: string,
    @Body() batchGenerateDto: BatchGenerateQrDto,
  ) {
    return this.tablesService.batchGenerateQrCodes(tenantId, batchGenerateDto);
  }

  @Get('qr/stats')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER)
  @ApiOperation({ summary: 'Get QR statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns QR statistics',
  })
  async getQrStats(@TenantContext() tenantId: string) {
    return this.tablesService.getQrStats(tenantId);
  }

  @Get('qr/verify-token')
  @Roles(ROLES.CUSTOMER, ROLES.GUEST)
  @UseGuards(QrTokenGuard)
  @ApiOperation({ summary: 'Verify QR token and get table context' })
  @ApiHeader({
    name: 'x-qr-token',
    required: false,
    description: 'QR token from scanned QR code or Bearer token for GUEST',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns table context for valid QR token',
  })
  verifyQrToken(@Req() request: any) {
    return {
      success: true,
      data: request.qrContext,
    };
  }

  // ============================================
  // Table CRUD
  // ============================================

  @Post()
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new table' })
  @ApiResponse({
    status: 201,
    description: 'Table created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Table number already exists',
  })
  async create(
    @TenantContext() tenantId: string,
    @Body() createTableDto: CreateTableDto,
  ) {
    return this.tablesService.create(tenantId, createTableDto);
  }

  @Get(':id')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
  @ApiOperation({ summary: 'Get table details by ID' })
  @ApiParam({ name: 'id', description: 'Table ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Returns table details',
  })
  @ApiResponse({
    status: 404,
    description: 'Table not found',
  })
  async findOne(@TenantContext() tenantId: string, @Param('id') id: string) {
    return this.tablesService.findOne(tenantId, id);
  }

  @Put(':id')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Update table' })
  @ApiParam({ name: 'id', description: 'Table ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Table updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Table not found',
  })
  async update(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() updateTableDto: UpdateTableDto,
  ) {
    return this.tablesService.update(tenantId, id, updateTableDto);
  }

  @Delete(':id')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete table' })
  @ApiParam({ name: 'id', description: 'Table ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Table deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Table not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete table with active orders',
  })
  async remove(@TenantContext() tenantId: string, @Param('id') id: string) {
    return this.tablesService.remove(tenantId, id);
  }

  @Patch(':id/status')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Update table status only' })
  @ApiParam({ name: 'id', description: 'Table ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Table status updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Table not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot change status (e.g., active orders)',
  })
  async updateStatus(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.tablesService.updateStatus(
      tenantId,
      id,
      updateStatusDto.status,
    );
  }

  @Put(':id/position')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Update table position' })
  @ApiParam({ name: 'id', description: 'Table ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Table position updated successfully',
  })
  async updatePosition(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() updatePositionDto: UpdatePositionDto,
  ) {
    return this.tablesService.updatePosition(tenantId, id, updatePositionDto);
  }

  @Post(':id/qr/generate')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate QR code for a table' })
  @ApiParam({ name: 'id', description: 'Table ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'QR code generated successfully',
  })
  async generateQrCode(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() generateQrDto: GenerateQrDto,
  ) {
    return this.tablesService.generateQrCodeForTable(
      tenantId,
      id,
      generateQrDto,
    );
  }

  @Get(':id/qr')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER)
  @ApiOperation({ summary: 'Get QR code for a specific table' })
  @ApiParam({ name: 'id', description: 'Table ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Returns QR code information',
  })
  async getTableQrCode(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.tablesService.getTableQrCode(tenantId, id);
  }

  // ============================================
  // QR Code Downloads
  // ============================================

  @Get('qr/download-all')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER)
  @ApiOperation({ summary: 'Download all QR codes as ZIP or PDF' })
  @ApiQuery({
    name: 'format',
    enum: DownloadFormat,
    required: false,
    description:
      'Download format: zip (individual PNGs) or pdf (single document)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns ZIP file with all QR codes or PDF document',
  })
  async downloadAllQrCodes(
    @TenantContext() tenantId: string,
    @Query('format') format?: DownloadFormat,
  ) {
    return this.tablesService.downloadAllQrCodes(
      tenantId,
      format || DownloadFormat.ZIP,
    );
  }

  @Get(':id/qr/download')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER)
  @ApiOperation({ summary: 'Download QR code for a specific table' })
  @ApiParam({ name: 'id', description: 'Table ID (UUID)' })
  @ApiQuery({
    name: 'format',
    enum: DownloadFormat,
    required: false,
    description: 'Download format: pdf or png',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns QR code as PNG or PDF',
  })
  async downloadQrCode(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Query('format') format?: DownloadFormat,
  ) {
    return this.tablesService.downloadQrCode(tenantId, id, format);
  }
}
