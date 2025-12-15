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
import { ZonesService } from './zones.service';
import { CreateZoneDto, UpdateZoneDto, QueryZonesDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('zones')
@Controller('zones')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  // ============================================
  // Zones List & Statistics
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Get paginated list of zones with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of zones',
  })
  async findAll(@CurrentUser() user: any, @Query() query: QueryZonesDto) {
    return this.zonesService.findAll(user.tenantId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get zone statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns zone statistics',
  })
  async getStats(@CurrentUser() user: any) {
    return this.zonesService.getStats(user.tenantId);
  }

  // ============================================
  // Zone CRUD Operations
  // ============================================

  @Get(':id')
  @ApiOperation({ summary: 'Get a single zone by ID' })
  @ApiParam({ name: 'id', description: 'Zone UUID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the zone',
  })
  @ApiResponse({
    status: 404,
    description: 'Zone not found',
  })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.zonesService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new zone' })
  @ApiResponse({
    status: 201,
    description: 'Zone created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Zone name already exists',
  })
  async create(@CurrentUser() user: any, @Body() createZoneDto: CreateZoneDto) {
    return this.zonesService.create(user.tenantId, createZoneDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a zone' })
  @ApiParam({ name: 'id', description: 'Zone UUID' })
  @ApiResponse({
    status: 200,
    description: 'Zone updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Zone not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Zone name already exists',
  })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateZoneDto: UpdateZoneDto,
  ) {
    return this.zonesService.update(user.tenantId, id, updateZoneDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a zone' })
  @ApiParam({ name: 'id', description: 'Zone UUID' })
  @ApiResponse({
    status: 200,
    description: 'Zone deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Zone not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Zone has tables and cannot be deleted',
  })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.zonesService.remove(user.tenantId, id);
  }
}
