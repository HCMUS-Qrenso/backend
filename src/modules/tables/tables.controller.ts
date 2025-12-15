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
  ApiQuery,
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
  VerifyTokenDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { Public, Roles, TenantContext } from '../../common/decorators';
import { ROLES } from 'src/common/constants';
import { RolesGuard, TenantOwnershipGuard } from 'src/common/guards';

@ApiTags('tables')
@Controller('tables')
@UseGuards(JwtAuthGuard, TenantOwnershipGuard)
@ApiBearerAuth('JWT-auth')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  // ============================================
  // Tables List & Statistics
  // ============================================

  @Get()
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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

  // ============================================
  // Table CRUD
  // ============================================

  @Post()
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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

  // ============================================
  // Token Verification (Public)
  // ============================================

  @Public()
  @Post('verify-token')
  @ApiOperation({ summary: 'Verify QR code token (public endpoint)' })
  @ApiResponse({
    status: 200,
    description: 'Token verification result',
  })
  @HttpCode(HttpStatus.OK)
  async verifyToken(@Body() verifyTokenDto: VerifyTokenDto) {
    return this.tablesService.verifyToken(verifyTokenDto.token);
  }
}
