import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import { PrismaService } from '../../prisma.service';
import { t } from '../../common/utils';
import {
  PaymentStatus,
  OrderPaymentStatus,
  PayOSStatus,
  PaymentMethodType,
  OrderStatus,
} from '../../common/constants';
import { CreatePaymentDto, QueryPaymentsDto, WebhookDataDto } from './dto';
import { Prisma } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly qrApiUrl =
    process.env.QR_API_URL || 'https://api.qrserver.com/v1/create-qr-code/';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Get PayOS instance for a specific tenant
   */
  private async getPayOSInstance(tenantId: string): Promise<PayOS> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        payosClientId: true,
        payosApiKey: true,
        payosChecksumKey: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(
        t('tenant.tenantNotFound', 'Tenant not found'),
      );
    }

    const { payosClientId, payosApiKey, payosChecksumKey } = tenant;

    if (!payosClientId || !payosApiKey || !payosChecksumKey) {
      throw new BadRequestException(
        t(
          'payment.credentialsNotConfigured',
          'PayOS credentials not configured for this tenant',
        ),
      );
    }

    return new PayOS({
      clientId: payosClientId,
      apiKey: payosApiKey,
      checksumKey: payosChecksumKey,
    });
  }

  /**
   * Create a payment link for an order using PayOS or cash
   */
  async createPaymentLink(
    tenantId: string,
    createPaymentDto: CreatePaymentDto,
  ) {
    const { orderId, description, returnUrl, cancelUrl, paymentMethod } =
      createPaymentDto;

    // Validate order exists and belongs to tenant
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
      include: {
        items: {
          include: {
            menuItem: true,
            modifiers: true,
          },
        },
        tableSession: {
          include: {
            table: {
              include: {
                zone: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          where: {
            status: {
              in: [
                OrderPaymentStatus.INITIATED,
                OrderPaymentStatus.PROCESSING,
                OrderPaymentStatus.PAID,
              ],
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        t('payment.orderNotFound', 'Order not found'),
      );
    }

    // Check if order already has a pending/processing/paid payment
    if (order.payments.length > 0) {
      throw new ConflictException(
        t(
          'payment.alreadyExists',
          'Order already has a pending or completed payment',
        ),
      );
    }

    // Check if order is completed
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException(
        t(
          'payment.orderNotCompleted',
          'Order must be completed before payment can be created',
        ),
      );
    }

    // Check payment lock
    if (order.paymentStatus === OrderPaymentStatus.PROCESSING) {
      throw new ConflictException(
        t('payment.paymentLocked', 'Payment is currently being processed'),
      );
    }

    // Handle CASH payment method
    if (paymentMethod === PaymentMethodType.CASH) {
      // Generate unique transaction ID for cash payment
      const transactionId = `CASH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Calculate total amount
      const amount = Number(order.totalAmount);

      // Create payment record in database
      const payment = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          tenantId,
          paymentMethod: 'cash',
          amount: order.totalAmount,
          currency: 'VND',
          status: PaymentStatus.PENDING,
          transactionId,
          gatewayResponse: Prisma.JsonNull,
        },
      });

      // Update order payment status to initiated
      await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: OrderPaymentStatus.INITIATED },
      });

      this.logger.log(
        `Cash payment created for order ${order.orderNumber}, payment ID: ${payment.id}`,
      );

      return {
        paymentId: payment.id,
        paymentMethod: 'cash',
        transactionId,
        amount,
        currency: 'VND',
        status: PaymentStatus.PENDING,
        createdAt: payment.createdAt,
        message: t(
          'payment.cashCreated',
          'Cash payment created. Please complete payment manually.',
        ),
      };
    }

    // Handle QR payment method with PayOS
    // Generate unique order code for PayOS (use timestamp + random number)
    const orderCode = Date.now() + Math.floor(Math.random() * 1000);

    // Prepare items for PayOS
    const items = order.items.map((item) => ({
      name: item.menuItem.name,
      quantity: item.quantity,
      price: Math.round(Number(item.unitPrice)),
    }));

    // Calculate total amount (must be integer for PayOS)
    const amount = Math.round(Number(order.totalAmount));

    // Get return and cancel URLs from env or use provided ones
    const finalReturnUrl =
      returnUrl || this.configService.get<string>('PAYOS_RETURN_URL');
    const finalCancelUrl =
      cancelUrl || this.configService.get<string>('PAYOS_CANCEL_URL');

    // Create payment link data
    const fullDescription =
      description ||
      `Payment for Order ${order.orderNumber} at Table ${order.tableSession.table.tableNumber}`;

    const paymentLinkData: any = {
      orderCode,
      amount,
      description:
        fullDescription.length > 25
          ? fullDescription.substring(0, 25)
          : fullDescription,
      items,
      returnUrl: finalReturnUrl,
      cancelUrl: finalCancelUrl,
    };

    try {
      // Get tenant-specific PayOS instance
      const payOS = await this.getPayOSInstance(tenantId);

      // Create payment link with PayOS
      const paymentLinkResponse =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await payOS.paymentRequests.create(paymentLinkData);

      // Create payment record in database
      const payment = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          tenantId,
          paymentMethod: 'payos',
          amount: order.totalAmount,
          currency: 'VND',
          status: PaymentStatus.PENDING,
          transactionId: String(orderCode),
          gatewayResponse: paymentLinkResponse as Prisma.InputJsonValue,
        },
      });

      // Update order payment status to initiated
      await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: OrderPaymentStatus.INITIATED },
      });

      this.logger.log(
        `Payment link created for order ${order.orderNumber}: ${paymentLinkResponse.checkoutUrl}`,
      );

      return {
        paymentId: payment.id,
        paymentMethod: 'payos',
        transactionId: String(orderCode),
        checkoutUrl: paymentLinkResponse.checkoutUrl,
        paymentLinkId: paymentLinkResponse.paymentLinkId,
        amount,
        currency: 'VND',
        status: PaymentStatus.PENDING,
        qrCode: `${this.qrApiUrl}?data=${encodeURIComponent(paymentLinkResponse.qrCode)}&size=250x250`,
        qrCodeData: paymentLinkResponse.qrCode,
        createdAt: payment.createdAt,
      };
    } catch (error) {
      this.logger.error('Failed to create PayOS payment link', error);
      throw new BadRequestException(
        t('payment.createFailed', 'Failed to create payment link', {
          args: { error: (error as Error).message },
        }),
      );
    }
  }

  /**
   * Handle PayOS webhook for payment confirmation
   */
  async handleWebhook(webhookData: WebhookDataDto) {
    const { code, desc, success, data } = webhookData;
    const { orderCode, description } = data;

    this.logger.log(
      `Received PayOS webhook for order code: ${orderCode}, status: ${code}, desc: ${desc}, success: ${success}`,
    );

    // Handle PayOS webhook verification request (dummy/test request)
    if (orderCode === 123 && description === 'VQRIO123') {
      this.logger.log(
        'Detected PayOS webhook verification request, returning success',
      );
      return {
        message: t(
          'payment.webhookProcessed',
          'Webhook processed successfully',
        ),
        verification: true,
      };
    }

    // Find payment by transaction ID (order code)
    const payment = await this.prisma.payment.findFirst({
      where: {
        transactionId: String(orderCode),
        paymentMethod: 'payos',
      },
      include: {
        order: true,
      },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for order code: ${orderCode}`);
      throw new NotFoundException(t('payment.notFound', 'Payment not found'));
    }

    // Verify webhook signature with tenant-specific credentials
    const webhookDataForVerification = {
      ...webhookData,
      success: webhookData.success ?? true,
    };
    const isValid = await this.verifyWebhookSignature(
      payment.tenantId,
      webhookDataForVerification,
    );
    if (!isValid) {
      throw new BadRequestException(
        t('payment.invalidSignature', 'Invalid webhook signature'),
      );
    }

    // Check if payment is already processed
    if (
      payment.status === PaymentStatus.PAID ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      this.logger.warn(
        `Payment ${payment.id} already processed with status: ${payment.status}`,
      );
      return {
        message: t(
          'payment.webhookAlreadyProcessed',
          'Payment already processed',
        ),
        payment,
      };
    }

    // Update payment based on webhook code
    let paymentStatus: string;
    let orderPaymentStatus: string;

    if (code === '00') {
      // Success
      paymentStatus = PaymentStatus.PAID;
      orderPaymentStatus = OrderPaymentStatus.PAID;
    } else if (code === '01') {
      // Failed
      paymentStatus = PaymentStatus.FAILED;
      orderPaymentStatus = OrderPaymentStatus.FAILED;
    } else if (code === '02') {
      // Cancelled
      paymentStatus = PaymentStatus.CANCELLED;
      orderPaymentStatus = OrderPaymentStatus.FAILED;
    } else {
      paymentStatus = PaymentStatus.PROCESSING;
      orderPaymentStatus = OrderPaymentStatus.PROCESSING;
    }

    try {
      // Update payment and order in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Update payment
        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: paymentStatus,
            gatewayResponse: webhookData as unknown as Prisma.InputJsonValue,
            paidAt: paymentStatus === PaymentStatus.PAID ? new Date() : null,
          },
        });

        // Update order payment status
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: orderPaymentStatus,
          },
        });

        return updatedPayment;
      });

      this.logger.log(
        `Payment ${payment.id} updated to status: ${paymentStatus}`,
      );

      // Emit socket event for payment status update
      const order = await this.prisma.order.findUnique({
        where: { id: payment.orderId },
        select: { tenantId: true },
      });
      if (order) {
        this.eventsGateway.emitPaymentUpdated(
          order.tenantId,
          payment.orderId,
          result,
        );
      }

      return {
        message: t(
          'payment.webhookProcessed',
          'Webhook processed successfully',
        ),
        payment: result,
      };
    } catch (error) {
      this.logger.error('Failed to process webhook', error);
      throw new BadRequestException(
        t('payment.webhookFailed', 'Failed to process webhook', {
          args: { error: (error as Error).message },
        }),
      );
    }
  }

  /**
   * Verify payment signature from PayOS
   */
  async verifyWebhookSignature(
    tenantId: string,
    webhookData: WebhookDataDto & { success: boolean },
  ): Promise<boolean> {
    try {
      const payOS = await this.getPayOSInstance(tenantId);
      await payOS.webhooks.verify(webhookData);
      return true;
    } catch (error) {
      this.logger.error('Failed to verify webhook signature', error);
      return false;
    }
  }

  /**
   * Cancel payment link
   */
  async cancelPaymentLink(
    tenantId: string,
    paymentId: string,
    reason?: string,
  ) {
    // Find payment
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        tenantId,
      },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(t('payment.notFound', 'Payment not found'));
    }

    // Check if payment can be cancelled
    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException(
        t('payment.cannotCancelPaid', 'Cannot cancel a paid payment'),
      );
    }

    if (payment.status === PaymentStatus.CANCELLED) {
      throw new BadRequestException(
        t('payment.alreadyCancelled', 'Payment already cancelled'),
      );
    }

    try {
      // For PayOS payments, cancel on the gateway
      if (payment.paymentMethod === 'payos') {
        const orderCode = Number(payment.transactionId);

        // Get tenant-specific PayOS instance
        const payOS = await this.getPayOSInstance(tenantId);

        // Cancel payment link on PayOS
        await payOS.paymentRequests.cancel(orderCode, reason);

        this.logger.log(
          `PayOS payment link cancelled for order code: ${orderCode}`,
        );
      } else {
        // For cash payments, just log the cancellation
        this.logger.log(
          `Cash payment ${paymentId} cancelled. No gateway action required.`,
        );
      }

      // Update payment status in database
      const updatedPayment = await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.CANCELLED,
            cancelReason: reason,
          },
        });

        // Update order payment status
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: OrderPaymentStatus.FAILED,
          },
        });

        return payment;
      });

      this.logger.log(`Payment ${paymentId} cancelled successfully`);

      return updatedPayment;
    } catch (error) {
      this.logger.error('Failed to cancel payment link', error);
      throw new BadRequestException(
        t('payment.cancelFailed', 'Failed to cancel payment', {
          args: { error: (error as Error).message },
        }),
      );
    }
  }

  /**
   * Get all payments with filtering
   */
  async findAll(tenantId: string, query: QueryPaymentsDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      payment_method,
      order_id,
      date_from,
      date_to,
      sort_by = 'createdAt',
      sort_order = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.PaymentWhereInput = {
      tenantId,
    };

    // Search filter
    if (search) {
      where.OR = [
        {
          transactionId: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          order: {
            orderNumber: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Payment method filter
    if (payment_method) {
      where.paymentMethod = payment_method;
    }

    // Order ID filter
    if (order_id) {
      where.orderId = order_id;
    }

    // Date range filter
    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) {
        where.createdAt.gte = new Date(date_from);
      }
      if (date_to) {
        where.createdAt.lte = new Date(date_to);
      }
    }

    // Execute query with pagination
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
              status: true,
              tableSession: {
                select: {
                  table: {
                    select: {
                      tableNumber: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          [sort_by]: sort_order,
        },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single payment by ID
   */
  async findOne(tenantId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        tenantId,
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                menuItem: true,
                modifiers: true,
              },
            },
            tableSession: {
              include: {
                table: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(t('payment.notFound', 'Payment not found'));
    }

    return payment;
  }

  /**
   * Check payment status by order code
   */
  async checkPaymentStatus(tenantId: string, transactionId: string) {
    try {
      // Find payment in database first
      const payment = await this.prisma.payment.findFirst({
        where: {
          transactionId: transactionId,
          tenantId,
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException(t('payment.notFound', 'Payment not found'));
      }

      // If it's a cash payment, return local status only
      if (payment.paymentMethod === 'cash') {
        return {
          status: payment.status,
          paymentMethod: 'cash',
          amount: Number(payment.amount),
          currency: payment.currency,
          orderNumber: payment.order.orderNumber,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
        };
      }

      // For PayOS payments, check with gateway
      const payOS = await this.getPayOSInstance(tenantId);

      // Get payment info from PayOS
      const paymentInfo = await payOS.paymentRequests.get(transactionId);

      // Map PayOS status to local status
      const statusMap: Record<string, string> = {
        [PayOSStatus.PENDING]: PaymentStatus.PENDING,
        [PayOSStatus.PROCESSING]: PaymentStatus.PROCESSING,
        [PayOSStatus.PAID]: PaymentStatus.PAID,
        [PayOSStatus.CANCELLED]: PaymentStatus.CANCELLED,
        [PayOSStatus.EXPIRED]: PaymentStatus.FAILED,
        [PayOSStatus.FAILED]: PaymentStatus.FAILED,
        [PayOSStatus.UNDERPAID]: PaymentStatus.FAILED,
      };

      const localStatus =
        statusMap[paymentInfo.status as string] || payment.status;

      // Sync status if different
      if (localStatus !== payment.status) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: localStatus,
            gatewayResponse: paymentInfo as Prisma.InputJsonValue,
            paidAt:
              localStatus === PaymentStatus.PAID && !payment.paidAt
                ? new Date()
                : payment.paidAt,
          },
        });
      }

      // Return simplified response
      return {
        status: localStatus,
        paymentMethod: 'payos',
        amount: paymentInfo.amount,
        currency: payment.currency,
        orderNumber: payment.order.orderNumber,
        payosStatus: paymentInfo.status,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        synced: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to check payment status for transaction ID ${transactionId}`,
        error,
      );
      throw new BadRequestException(
        t('payment.statusCheckFailed', 'Failed to check payment status', {
          args: { error: (error as Error).message },
        }),
      );
    }
  }

  /**
   * Manually complete a payment (for cash payments)
   */
  async completePayment(tenantId: string, paymentId: string) {
    // Find payment
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        tenantId,
      },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(t('payment.notFound', 'Payment not found'));
    }

    // Check if payment is already completed
    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException(
        t('payment.alreadyPaid', 'Payment is already completed'),
      );
    }

    // Check if payment is cancelled
    if (payment.status === PaymentStatus.CANCELLED) {
      throw new BadRequestException(
        t('payment.cancelled', 'Cannot complete a cancelled payment'),
      );
    }

    // Only allow manual completion for cash payments
    if (payment.paymentMethod !== 'cash') {
      throw new BadRequestException(
        t(
          'payment.onlyCashManualComplete',
          'Only cash payments can be manually completed',
        ),
      );
    }

    try {
      // Update payment and order in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Update payment
        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
          },
        });

        // Update order payment status
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: OrderPaymentStatus.PAID,
          },
        });

        return updatedPayment;
      });

      this.logger.log(
        `Cash payment ${paymentId} manually completed for order ${payment.order.orderNumber}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Failed to complete payment', error);
      throw new BadRequestException(
        t('payment.completeFailed', 'Failed to complete payment', {
          args: { error: (error as Error).message },
        }),
      );
    }
  }
}
