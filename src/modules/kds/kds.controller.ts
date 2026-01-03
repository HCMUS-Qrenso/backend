import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { KdsService } from './kds.service';
import { QueryKdsOrdersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { Roles, TenantContext } from '../../common/decorators';
import { ROLES } from '../../common/constants';
import { RolesGuard, TenantOwnershipGuard } from '../../common/guards';

@ApiTags('kds')
@Controller('kds')
@ApiBearerAuth('JWT-auth')
export class KdsController {
  constructor(private readonly kdsService: KdsService) {}

  @Get('orders')
  @UseGuards(JwtAuthGuard, TenantOwnershipGuard, RolesGuard)
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
  @ApiOperation({
    summary: 'Get orders for Kitchen Display System',
    description:
      'Returns active orders optimized for KDS display, sorted by priority algorithm. Includes items with active statuses only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns KDS orders with stats',
    schema: {
      example: {
        success: true,
        data: {
          orders: [
            {
              id: 'uuid',
              orderNumber: 'ORD-20251230-ABC-001',
              tableNumber: '5',
              zoneName: 'Tầng 1',
              waiterName: 'Nguyễn Văn A',
              status: 'in_progress',
              priority: 'high',
              specialInstructions: 'Khách yêu cầu nhanh',
              createdAt: '2025-12-30T10:00:00Z',
              items: [
                {
                  id: 'uuid',
                  menuItemName: 'Phở bò đặc biệt',
                  quantity: 2,
                  status: 'preparing',
                  specialInstructions: 'Ít hành',
                  estimatedPrepTime: 15,
                  allergenInfo: 'gluten',
                  modifiers: [{ modifierName: 'Thêm thịt', priceAdjustment: 20000 }],
                },
              ],
            },
          ],
        },
        meta: {
          total: 10,
          activeCount: 10,
          overdueCount: 2,
        },
      },
    },
  })
  async getKdsOrders(
    @TenantContext() tenantId: string,
    @Query() query: QueryKdsOrdersDto,
  ) {
    return this.kdsService.getKdsOrders(tenantId, query);
  }
}
