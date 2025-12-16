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
import { Roles, TenantContext } from '../../common/decorators';
import { RolesGuard, TenantOwnershipGuard } from 'src/common/guards';
import { ROLES } from 'src/common/constants';

@ApiTags('zones')
@Controller('zones')
@UseGuards(JwtAuthGuard, TenantOwnershipGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  // ============================================
  // Zones List & Statistics
  // ============================================

  @Get()
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
  @ApiOperation({ summary: 'Get paginated list of zones with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of zones',
  })
  async findAll(
    @TenantContext() tenantId: string,
    @Query() query: QueryZonesDto,
  ) {
    return this.zonesService.findAll(tenantId, query);
  }

  @Get('stats')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
  @ApiOperation({ summary: 'Get zone statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns zone statistics',
  })
  async getStats(@TenantContext() tenantId: string) {
    return this.zonesService.getStats(tenantId);
  }

  // ============================================
  // Zone CRUD Operations
  // ============================================

  @Get(':id')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
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
  async findOne(@TenantContext() tenantId: string, @Param('id') id: string) {
    return this.zonesService.findOne(tenantId, id);
  }

  @Post()
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Create a new zone' })
  @ApiResponse({
    status: 201,
    description: 'Zone created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Zone name already exists',
  })
  async create(
    @TenantContext() tenantId: string,
    @Body() createZoneDto: CreateZoneDto,
  ) {
    return this.zonesService.create(tenantId, createZoneDto);
  }

  @Put(':id')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
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
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() updateZoneDto: UpdateZoneDto,
  ) {
    return this.zonesService.update(tenantId, id, updateZoneDto);
  }

  @Delete(':id')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
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
  async remove(@TenantContext() tenantId: string, @Param('id') id: string) {
    return this.zonesService.remove(tenantId, id);
  }
}
