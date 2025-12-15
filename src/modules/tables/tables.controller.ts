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
import { CurrentUser, Public } from '../../common/decorators';

@ApiTags('tables')
@Controller('tables')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  // ============================================
  // Tables List & Statistics
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Get paginated list of tables with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of tables',
  })
  async findAll(@CurrentUser() user: any, @Query() query: QueryTablesDto) {
    return this.tablesService.findAll(user.tenantId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get table statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns table statistics',
  })
  async getStats(@CurrentUser() user: any) {
    return this.tablesService.getStats(user.tenantId);
  }

  // ============================================
  // Floor Plan Layout
  // ============================================

  @Get('layout')
  @ApiOperation({ summary: 'Get layout by zone' })
  @ApiResponse({
    status: 200,
    description: 'Returns tables layout for a specific zone',
  })
  async getLayout(@CurrentUser() user: any, @Query('zone_id') zoneId: string) {
    return this.tablesService.getLayout(user.tenantId, zoneId);
  }

  @Get('zones')
  @ApiOperation({ summary: 'Get available zones' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of available zones',
  })
  async getZones(@CurrentUser() user: any) {
    return this.tablesService.getZones(user.tenantId);
  }

  @Post('layout/batch-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Batch update table positions' })
  @ApiResponse({
    status: 200,
    description: 'Successfully updated table positions',
  })
  async batchUpdateLayout(
    @CurrentUser() user: any,
    @Body() batchUpdateDto: BatchUpdateLayoutDto,
  ) {
    return this.tablesService.batchUpdateLayout(user.tenantId, batchUpdateDto);
  }

  // ============================================
  // QR Code Management
  // ============================================

  @Get('qr')
  @ApiOperation({ summary: 'Get all QR codes' })
  @ApiResponse({
    status: 200,
    description: 'Returns QR code information for all tables',
  })
  async getAllQrCodes(@CurrentUser() user: any, @Query() query: QueryQrDto) {
    return this.tablesService.getAllQrCodes(user.tenantId, query);
  }

  @Post('qr/batch-generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Batch generate QR codes' })
  @ApiResponse({
    status: 200,
    description: 'Successfully generated QR codes',
  })
  async batchGenerateQrCodes(
    @CurrentUser() user: any,
    @Body() batchGenerateDto: BatchGenerateQrDto,
  ) {
    return this.tablesService.batchGenerateQrCodes(
      user.tenantId,
      batchGenerateDto,
    );
  }

  // ============================================
  // Table CRUD
  // ============================================

  @Post()
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
    @CurrentUser() user: any,
    @Body() createTableDto: CreateTableDto,
  ) {
    return this.tablesService.create(user.tenantId, createTableDto);
  }

  @Get(':id')
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
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tablesService.findOne(user.tenantId, id);
  }

  @Put(':id')
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
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateTableDto: UpdateTableDto,
  ) {
    return this.tablesService.update(user.tenantId, id, updateTableDto);
  }

  @Delete(':id')
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
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tablesService.remove(user.tenantId, id);
  }

  @Patch(':id/status')
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
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.tablesService.updateStatus(
      user.tenantId,
      id,
      updateStatusDto.status,
    );
  }

  @Put(':id/position')
  @ApiOperation({ summary: 'Update table position' })
  @ApiParam({ name: 'id', description: 'Table ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Table position updated successfully',
  })
  async updatePosition(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updatePositionDto: UpdatePositionDto,
  ) {
    return this.tablesService.updatePosition(
      user.tenantId,
      id,
      updatePositionDto,
    );
  }

  @Post(':id/qr/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate QR code for a table' })
  @ApiParam({ name: 'id', description: 'Table ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'QR code generated successfully',
  })
  async generateQrCode(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() generateQrDto: GenerateQrDto,
  ) {
    return this.tablesService.generateQrCodeForTable(
      user.tenantId,
      id,
      generateQrDto,
    );
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Get QR code for a specific table' })
  @ApiParam({ name: 'id', description: 'Table ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Returns QR code information',
  })
  async getTableQrCode(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tablesService.getTableQrCode(user.tenantId, id);
  }

  // ============================================
  // QR Code Downloads
  // ============================================

  @Get('qr/download-all')
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
    @CurrentUser() user: any,
    @Query('format') format?: DownloadFormat,
  ) {
    return this.tablesService.downloadAllQrCodes(
      user.tenantId,
      format || DownloadFormat.ZIP,
    );
  }

  @Get(':id/qr/download')
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
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('format') format?: DownloadFormat,
  ) {
    return this.tablesService.downloadQrCode(user.tenantId, id, format);
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
