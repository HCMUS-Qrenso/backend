import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Delete,
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
import { PaymentService } from './payment.service';
import {
  CreatePaymentDto,
  QueryPaymentsDto,
  WebhookDataDto,
  RequestBillDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import {
  RolesGuard,
  QrTokenGuard,
  TenantOwnershipGuard,
} from '../../common/guards';
import { Roles, Public, TenantContext } from '../../common/decorators';
import { ROLES } from 'src/common/constants';

@ApiTags('payments')
@Controller('payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard, TenantOwnershipGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @Roles(ROLES.ADMIN, ROLES.OWNER, ROLES.WAITER)
  @ApiOperation({
    summary: 'Create a payment link for an order',
    description: 'Creates a PayOS payment link for a completed order',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment link created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid order or payment data',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Payment already exists for this order',
  })
  async createPayment(
    @TenantContext() tenantId: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentService.createPaymentLink(tenantId, createPaymentDto);
  }

  @Post('request-bill')
  @Roles(ROLES.CUSTOMER, ROLES.GUEST)
  @UseGuards(QrTokenGuard)
  @ApiOperation({
    summary: 'Request bill for an order',
    description: 'Customer requests bill, sends notification to waiter',
  })
  @ApiResponse({
    status: 200,
    description: 'Bill request sent successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async requestBill(
    @TenantContext() tenantId: string,
    @Body() requestBillDto: RequestBillDto,
  ) {
    return this.paymentService.requestBill(tenantId, requestBillDto);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'PayOS webhook endpoint',
    description:
      'Receives payment confirmation webhooks from PayOS. This endpoint is public and should be registered in PayOS dashboard.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook data or signature',
  })
  async handleWebhook(@Body() webhookData: WebhookDataDto) {
    return this.paymentService.handleWebhook(webhookData);
  }

  @Get()
  @Roles(ROLES.ADMIN, ROLES.OWNER, ROLES.WAITER)
  @ApiOperation({
    summary: 'Get all payments with filtering',
    description: 'Retrieve paginated list of payments with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved successfully',
  })
  async findAll(
    @TenantContext() tenantId: string,
    @Query() query: QueryPaymentsDto,
  ) {
    return this.paymentService.findAll(tenantId, query);
  }

  @Get(':id')
  @Roles(ROLES.ADMIN, ROLES.OWNER, ROLES.WAITER)
  @ApiOperation({
    summary: 'Get payment by ID',
    description: 'Retrieve detailed information about a specific payment',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async findOne(@TenantContext() tenantId: string, @Param('id') id: string) {
    return this.paymentService.findOne(tenantId, id);
  }

  @Get('check/:transactionId')
  @Roles(ROLES.ADMIN, ROLES.OWNER, ROLES.WAITER)
  @ApiOperation({
    summary: 'Check payment status by transaction ID',
    description:
      'Check the current status of a payment from PayOS and sync with local database',
  })
  @ApiParam({
    name: 'transactionId',
    description: 'PayOS order ID / transaction ID',
    example: '123456',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async checkPaymentStatus(
    @TenantContext() tenantId: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.paymentService.checkPaymentStatus(tenantId, transactionId);
  }

  @Delete(':id')
  @Roles(ROLES.ADMIN, ROLES.OWNER, ROLES.WAITER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel payment link',
    description: 'Cancel a pending payment link. Cannot cancel paid payments.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'reason',
    required: false,
    description: 'Reason for cancellation',
    example: 'Customer requested cancellation',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel this payment',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async cancelPayment(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ) {
    return this.paymentService.cancelPaymentLink(tenantId, id, reason);
  }

  @Post(':id/complete')
  @Roles(ROLES.ADMIN, ROLES.OWNER, ROLES.WAITER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually complete a payment',
    description:
      'Manually mark a cash payment as completed. Only works for cash payments.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot complete this payment',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async completePayment(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.paymentService.completePayment(tenantId, id);
  }
}
