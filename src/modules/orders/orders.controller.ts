import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
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
  ApiHeader,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import {
  QueryOrdersDto,
  CreateOrderDto,
  AddOrderItemsDto,
  UpdateOrderStatusDto,
  UpdateOrderPriorityDto,
  AssignWaiterDto,
  UpdateOrderItemStatusDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import {
  Roles,
  TenantContext,
  CurrentUser,
  Idempotent,
} from '../../common/decorators';
import { ROLES } from '../../common/constants';
import {
  QrTokenGuard,
  RolesGuard,
  TenantOwnershipGuard,
} from '../../common/guards';
import {
  SessionActivityInterceptor,
  IdempotencyInterceptor,
} from '../../common/interceptors';

@ApiTags('orders')
@Controller('orders')
@ApiBearerAuth('JWT-auth')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ============================================
  // Admin/Staff Endpoints (JWT Auth)
  // ============================================

  @Get()
  @UseGuards(JwtAuthGuard, TenantOwnershipGuard, RolesGuard)
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
  @ApiOperation({ summary: 'Get paginated list of orders with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of orders',
  })
  async findAll(
    @TenantContext() tenantId: string,
    @Query() query: QueryOrdersDto,
  ) {
    return this.ordersService.findAll(tenantId, query);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, TenantOwnershipGuard, RolesGuard)
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER)
  @ApiOperation({ summary: 'Get order statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns order statistics',
  })
  async getStats(@TenantContext() tenantId: string) {
    return this.ordersService.getStats(tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantOwnershipGuard, RolesGuard)
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
  @ApiOperation({ summary: 'Get order details by ID' })
  @ApiParam({ name: 'id', description: 'Order ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Returns order details',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async findOne(@TenantContext() tenantId: string, @Param('id') id: string) {
    return this.ordersService.findOne(tenantId, id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, TenantOwnershipGuard, RolesGuard)
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER)
  @ApiOperation({ summary: 'Update order status (accept, reject, etc.)' })
  @ApiParam({ name: 'id', description: 'Order ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
  })
  async updateStatus(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.updateStatus(
      tenantId,
      id,
      updateStatusDto,
      user.id,
    );
  }

  @Patch(':id/priority')
  @UseGuards(JwtAuthGuard, TenantOwnershipGuard, RolesGuard)
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER)
  @ApiOperation({ summary: 'Update order priority' })
  @ApiParam({ name: 'id', description: 'Order ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Order priority updated successfully',
  })
  async updatePriority(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() updatePriorityDto: UpdateOrderPriorityDto,
  ) {
    // Simple priority update
    const { findOne } = this.ordersService;
    // Implementation would be similar to updateStatus
    // For now, return the order
    return this.ordersService.findOne(tenantId, id);
  }

  @Patch(':id/items/:itemId/status')
  @UseGuards(JwtAuthGuard, TenantOwnershipGuard, RolesGuard)
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN)
  @ApiOperation({ summary: 'Update order item status (for kitchen)' })
  @ApiParam({ name: 'id', description: 'Order ID (UUID)' })
  @ApiParam({ name: 'itemId', description: 'Order Item ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Order item status updated successfully',
  })
  async updateItemStatus(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateStatusDto: UpdateOrderItemStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.updateItemStatus(
      tenantId,
      id,
      itemId,
      updateStatusDto,
      user?.id,
    );
  }

  // ============================================
  // Customer Endpoints (QR Token Auth)
  // ============================================

  @Post()
  @UseGuards(QrTokenGuard)
  @UseInterceptors(SessionActivityInterceptor, IdempotencyInterceptor)
  @Idempotent(60) // Cache response for 60 minutes
  @Roles(ROLES.CUSTOMER, ROLES.GUEST)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order (customer)' })
  @ApiHeader({
    name: 'Authorization',
    required: true,
    description: 'Bearer token from QR scan (session token)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Unique key for idempotent requests (prevents double orders)',
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or table already has active order',
  })
  async create(@Body() createOrderDto: CreateOrderDto, @Req() request: any) {
    const { qrContext } = request;
    return this.ordersService.create(
      qrContext.tenantId,
      qrContext.tableSessionId,
      createOrderDto,
      qrContext.customerId,
    );
  }

  @Post(':id/items')
  @UseGuards(QrTokenGuard)
  @UseInterceptors(SessionActivityInterceptor, IdempotencyInterceptor)
  @Idempotent(60) // Cache response for 60 minutes
  @Roles(ROLES.CUSTOMER, ROLES.GUEST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add items to an existing order (customer)' })
  @ApiParam({ name: 'id', description: 'Order ID (UUID)' })
  @ApiHeader({
    name: 'Authorization',
    required: true,
    description: 'Bearer token from QR scan (session token)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Unique key for idempotent requests (prevents duplicate item additions)',
  })
  @ApiResponse({
    status: 200,
    description: 'Items added to order successfully',
  })
  async addItems(
    @Param('id') id: string,
    @Body() addItemsDto: AddOrderItemsDto,
    @Req() request: any,
  ) {
    const { qrContext } = request;
    return this.ordersService.addItems(
      qrContext.tenantId,
      id,
      addItemsDto,
      qrContext.customerId,
    );
  }

  @Get('my-order')
  @UseGuards(QrTokenGuard)
  @UseInterceptors(SessionActivityInterceptor)
  @Roles(ROLES.CUSTOMER, ROLES.GUEST)
  @ApiOperation({ summary: 'Get current order for table session (customer)' })
  @ApiHeader({
    name: 'Authorization',
    required: true,
    description: 'Bearer token from QR scan (session token)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns current order for the table session',
  })
  async getMyOrder(@Req() request: any) {
    const { qrContext } = request;

    if (!qrContext.tableSessionId) {
      return {
        success: true,
        data: null,
        message: 'No active session. Please start a session first.',
      };
    }

    return this.ordersService.getMyOrder(
      qrContext.tableSessionId,
      qrContext.tenantId,
    );
  }
}
