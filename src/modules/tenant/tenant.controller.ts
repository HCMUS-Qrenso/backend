import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { QueryTenantsDto, UpdateTenantSettingsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { Roles, CurrentUser, TenantContext } from '../../common/decorators';
import { RolesGuard, TenantOwnershipGuard } from '../../common/guards';
import { ROLES } from '../../common/constants';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard, TenantOwnershipGuard)
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

  @Get('current')
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
  @ApiOperation({
    summary: 'Get detailed information about the current tenant',
    description:
      'Owners can view any tenant they own by specifying the x-tenant-id header. Staff members (admin, waiter, kitchen) can view only the tenant assigned to them via the JWT.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns detailed tenant information',
    schema: {
      example: {
        success: true,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Pizza Palace',
          slug: 'pizza-palace',
          address: '123 Main St, City',
          status: 'active',
          subscription_tier: 'premium',
          owner: {
            id: 'owner-uuid',
            full_name: 'John Doe',
            email: 'owner@example.com',
          },
          statistics: {
            total_users: 15,
            total_tables: 25,
            total_zones: 3,
            total_orders: 1250,
            total_categories: 8,
            total_menu_items: 45,
          },
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-12-15T14:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  async findOne(@TenantContext() tenantId: string) {
    return this.tenantService.findOne(tenantId);
  }

  // ============================================
  // Tenant Settings
  // ============================================

  @Get('settings')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({
    summary: 'Get tenant settings',
    description:
      'Returns all settings for the current tenant including general, tax, service charge, operating hours, order, notification, and receipt settings.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns tenant settings',
    schema: {
      example: {
        success: true,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Pizza Palace',
          general: {
            currency: 'VND',
            currency_symbol: '₫',
            timezone: 'Asia/Ho_Chi_Minh',
            date_format: 'DD/MM/YYYY',
            language: 'vi',
            phone: '+84123456789',
            contact_email: 'contact@restaurant.com',
          },
          tax: {
            rate: 10,
            inclusive: true,
            label: 'VAT',
          },
          service_charge: {
            enabled: false,
            rate: 5,
            taxable: false,
            min_party: null,
          },
          operating_hours: {
            monday: {
              isOpen: true,
              slots: [{ open: '09:00', close: '22:00' }],
            },
          },
          order: {
            min_value: 50000,
            estimated_prep_time: 15,
            allow_special_instructions: true,
            session_timeout_minutes: 120,
            require_guest_count: false,
          },
          notifications: {
            sound_enabled: true,
            email_enabled: false,
            email: null,
          },
          receipt: {
            header: 'Thank you for dining with us!',
            footer: 'Please visit us again!',
            show_logo: true,
            invoice_prefix: 'QR-',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  async getSettings(@TenantContext() tenantId: string) {
    return this.tenantService.getSettings(tenantId);
  }

  @Patch('settings')
  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @ApiOperation({
    summary: 'Update tenant settings',
    description:
      'Update one or more tenant settings. All fields are optional - only provided fields will be updated.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Settings updated successfully. Returns updated settings.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  async updateSettings(
    @TenantContext() tenantId: string,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    return this.tenantService.updateSettings(tenantId, dto);
  }
}
