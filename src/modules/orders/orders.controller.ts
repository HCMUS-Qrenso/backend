import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
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
  QueryMyOrdersDto,
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
import { VouchersService } from '../vouchers/vouchers.service';
import { ApplyVoucherDto, ApplyVoucherCodeDto, RevokeVoucherDto } from '../vouchers/dto';
import { ApplySource } from '@prisma/client';

@ApiTags('orders')
@Controller('orders')
@ApiBearerAuth('JWT-auth')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly vouchersService: VouchersService,
  ) {}

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

  // ============================================
  // Customer Endpoints (JWT Auth - Order History)
  // ============================================

  @Get('my-orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.CUSTOMER)
  @ApiOperation({
    summary: 'Get order history for authenticated customer',
    description:
      'Returns paginated list of orders placed by the authenticated customer. Requires JWT authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of customer orders',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async getMyOrders(
    @CurrentUser() user: any,
    @Query() query: QueryMyOrdersDto,
  ) {
    // JWT strategy returns user from database with 'id' field
    // Fallback to 'sub' in case payload is used directly
    const customerId = user?.id || user?.sub;
    if (!customerId) {
      throw new BadRequestException('User ID is required');
    }
    return this.ordersService.getMyOrders(customerId, query);
  }

  @Get('my-orders/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.CUSTOMER)
  @ApiOperation({
    summary: 'Get order details by ID for authenticated customer',
    description:
      'Returns order details for a specific order that belongs to the authenticated customer. Requires JWT authentication.',
  })
  @ApiParam({ name: 'id', description: 'Order ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Returns order details',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found or does not belong to customer',
  })
  async getMyOrderById(@CurrentUser() user: any, @Param('id') orderId: string) {
    const customerId = user?.id || user?.sub;
    if (!customerId) {
      throw new BadRequestException('User ID is required');
    }
    return this.ordersService.getMyOrderById(customerId, orderId);
  }

  // ============================================
  // Customer Endpoints (QR Token Auth)
  // IMPORTANT: These must be defined BEFORE :id routes
  // ============================================

  @Get('my-order')
  @UseGuards(JwtAuthGuard, QrTokenGuard)
  @UseInterceptors(SessionActivityInterceptor)
  @Roles(ROLES.CUSTOMER, ROLES.GUEST)
  @ApiOperation({
    summary: 'Get current order for table session (customer)',
    description:
      'Returns the single active order for the current table session. Alias for GET /orders/current',
  })
  @ApiHeader({
    name: 'x-table-session-token',
    required: true,
    description: 'Session token from POST /tables/session/start',
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

  @Get('current')
  @UseGuards(JwtAuthGuard, QrTokenGuard)
  @UseInterceptors(SessionActivityInterceptor)
  @Roles(ROLES.CUSTOMER, ROLES.GUEST)
  @ApiOperation({
    summary: 'Get current order for table session',
    description:
      'Returns the single active order for the current table session (single order per session pattern)',
  })
  @ApiHeader({
    name: 'x-table-session-token',
    required: true,
    description: 'Session token from POST /tables/session/start',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns current order with canAddItems flag',
  })
  async getCurrentOrder(@Req() request: any) {
    const { qrContext } = request;

    if (!qrContext.tableSessionId) {
      return {
        success: true,
        data: null,
        message: 'No active session. Please start a session first.',
      };
    }

    return this.ordersService.getCurrentOrder(
      qrContext.tableSessionId,
      qrContext.tenantId,
    );
  }

  @Post('current/items')
  @UseGuards(JwtAuthGuard, QrTokenGuard)
  @UseInterceptors(SessionActivityInterceptor, IdempotencyInterceptor)
  @Idempotent(60)
  @Roles(ROLES.CUSTOMER, ROLES.GUEST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add items to current order',
    description:
      'Adds items to the current order. Creates a new order if none exists (create-or-append pattern).',
  })
  @ApiHeader({
    name: 'x-table-session-token',
    required: true,
    description: 'Session token from POST /tables/session/start',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Unique key for idempotent requests',
  })
  @ApiResponse({
    status: 200,
    description: 'Items added successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot add items after payment has been initiated',
  })
  async addItemsToCurrentOrder(
    @Body() addItemsDto: AddOrderItemsDto,
    @Req() request: any,
  ) {
    const { qrContext } = request;

    if (!qrContext.tableSessionId) {
      throw new BadRequestException(
        'No active session. Please start a session first.',
      );
    }

    return this.ordersService.addItemsToCurrentOrder(
      qrContext.tenantId,
      qrContext.tableSessionId,
      addItemsDto,
      qrContext.customerId,
      qrContext.deviceId,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard, QrTokenGuard)
  @UseInterceptors(SessionActivityInterceptor, IdempotencyInterceptor)
  @Idempotent(60) // Cache response for 60 minutes
  @Roles(ROLES.CUSTOMER, ROLES.GUEST)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create order or add items to existing order (customer)',
    description:
      'If session has no active order, creates new order. If session has active order, appends items to it (single order per session pattern).',
  })
  @ApiHeader({
    name: 'x-table-session-token',
    required: true,
    description:
      'Session token from POST /tables/session/start (required for order operations)',
  })
  @ApiHeader({
    name: 'Authorization',
    required: false,
    description: 'Bearer {accessToken} for authenticated users (optional)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Unique key for idempotent requests (prevents duplicate orders/items)',
  })
  @ApiResponse({
    status: 201,
    description: 'Order created or items added successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot add items after payment has been initiated',
  })
  async create(@Body() createOrderDto: CreateOrderDto, @Req() request: any) {
    const { qrContext } = request;
    return this.ordersService.create(
      qrContext.tenantId,
      qrContext.tableSessionId,
      createOrderDto,
      qrContext.customerId,
      qrContext.deviceId, // Pass deviceId for multi-device tracking
    );
  }

  @Post(':id/items')
  @UseGuards(JwtAuthGuard, QrTokenGuard)
  @UseInterceptors(SessionActivityInterceptor, IdempotencyInterceptor)
  @Idempotent(60) // Cache response for 60 minutes
  @Roles(ROLES.CUSTOMER, ROLES.GUEST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add items to an existing order (customer)',
    description:
      'Appends items to an existing order. Will fail if payment has been initiated.',
  })
  @ApiParam({ name: 'id', description: 'Order ID (UUID)' })
  @ApiHeader({
    name: 'x-table-session-token',
    required: true,
    description: 'Session token from POST /tables/session/start',
  })
  @ApiHeader({
    name: 'Authorization',
    required: false,
    description: 'Bearer {accessToken} for authenticated users (optional)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Unique key for idempotent requests (prevents duplicate items)',
  })
  @ApiResponse({
    status: 200,
    description: 'Items added to order successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot add items after payment has been initiated',
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
      qrContext.deviceId, // Pass deviceId for multi-device tracking
    );
  }

  // ============================================
  // Admin/Staff Endpoints with :id parameter
  // IMPORTANT: These must be defined AFTER specific routes like 'my-order'
  // ============================================

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
  // Voucher Endpoints (Staff)
  // ============================================

  @Post(':id/vouchers/apply')
  @UseGuards(JwtAuthGuard, TenantOwnershipGuard, RolesGuard)
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a voucher to an order (staff)' })
  @ApiParam({ name: 'id', description: 'Order ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Voucher applied successfully' })
  @ApiResponse({ status: 400, description: 'Voucher not eligible' })
  @ApiResponse({ status: 409, description: 'Order already has a voucher' })
  async applyVoucher(
    @TenantContext() tenantId: string,
    @Param('id') orderId: string,
    @Body() dto: ApplyVoucherDto,
    @CurrentUser() user: any,
  ) {
    // Get order to extract context
    const orderResult = await this.ordersService.findOne(tenantId, orderId);
    const order = orderResult.data;

    return this.vouchersService.applyVoucher(
      {
        orderId,
        tenantId,
        subtotal: order.subtotal,
        customerId: order.customer?.id,
        tableSessionId: order.tableSession?.id,
      },
      dto,
      ApplySource.waiter,
      user.id,
    );
  }

  @Post(':id/vouchers/apply-code')
  @UseGuards(JwtAuthGuard, QrTokenGuard)
  @UseInterceptors(SessionActivityInterceptor)
  @Roles(ROLES.CUSTOMER, ROLES.GUEST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a voucher by code (customer)' })
  @ApiParam({ name: 'id', description: 'Order ID (UUID)' })
  @ApiHeader({
    name: 'x-table-session-token',
    required: true,
    description: 'Session token',
  })
  @ApiResponse({ status: 200, description: 'Voucher applied successfully' })
  @ApiResponse({ status: 404, description: 'Invalid voucher code' })
  async applyVoucherCode(
    @Param('id') orderId: string,
    @Body() dto: ApplyVoucherCodeDto,
    @Req() request: any,
  ) {
    const { qrContext } = request;

    // Get order to extract context
    const orderResult = await this.ordersService.findOne(qrContext.tenantId, orderId);
    const order = orderResult.data;

    return this.vouchersService.applyVoucherByCode(
      {
        orderId,
        tenantId: qrContext.tenantId,
        subtotal: order.subtotal,
        customerId: qrContext.customerId,
        tableSessionId: qrContext.tableSessionId,
      },
      dto,
    );
  }

  @Delete(':id/vouchers/:redemptionId')
  @UseGuards(JwtAuthGuard, TenantOwnershipGuard, RolesGuard)
  @Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.WAITER)
  @ApiOperation({ summary: 'Revoke a voucher from an order (staff)' })
  @ApiParam({ name: 'id', description: 'Order ID (UUID)' })
  @ApiParam({ name: 'redemptionId', description: 'Voucher Redemption ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Voucher revoked successfully' })
  async revokeVoucher(
    @TenantContext() tenantId: string,
    @Param('id') orderId: string,
    @Param('redemptionId') redemptionId: string,
    @Body() dto: RevokeVoucherDto,
    @CurrentUser() user: any,
  ) {
    return this.vouchersService.revokeVoucher(
      tenantId,
      orderId,
      redemptionId,
      dto,
      user.id,
    );
  }
}
