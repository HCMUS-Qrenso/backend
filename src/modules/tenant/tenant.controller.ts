import { Controller, Get, Query, UseGuards, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { QueryTenantsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { ROLES } from '../../common/constants';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // ============================================
  // Owner Tenant Management
  // ============================================

  @Get()
  @Roles(ROLES.OWNER)
  @ApiOperation({
    summary: 'Get all tenants owned by the current owner',
    description:
      'Returns a paginated list of all restaurants/tenants that belong to the authenticated owner',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns paginated list of tenants with statistics',
    schema: {
      example: {
        success: true,
        data: {
          tenants: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              name: 'Pizza Palace',
              slug: 'pizza-palace',
              address: '123 Main St, City',
              status: 'active',
              subscription_tier: 'premium',
              settings: {},
              statistics: {
                total_users: 15,
                total_tables: 25,
                total_zones: 3,
                total_orders: 1250,
              },
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2024-12-15T14:30:00Z',
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 5,
            total_pages: 1,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized - must be an owner',
  })
  async findAll(
    @CurrentUser('id') ownerId: string,
    @Query() query: QueryTenantsDto,
  ) {
    return this.tenantService.findAllByOwner(ownerId, query);
  }

  @Get('stats')
  @Roles(ROLES.OWNER)
  @ApiOperation({
    summary: 'Get statistics for all tenants owned by the current owner',
    description:
      'Returns summary statistics including total tenants, status breakdown, and subscription tier breakdown',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns tenant statistics',
    schema: {
      example: {
        success: true,
        data: {
          total_tenants: 5,
          active_tenants: 4,
          inactive_tenants: 0,
          suspended_tenants: 1,
          subscription_breakdown: {
            basic: 2,
            premium: 2,
            enterprise: 1,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized - must be an owner',
  })
  async getStats(@CurrentUser('id') ownerId: string) {
    return this.tenantService.getOwnerStats(ownerId);
  }
}
