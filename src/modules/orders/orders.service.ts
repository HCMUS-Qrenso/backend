import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';
import {
  QueryOrdersDto,
  QueryMyOrdersDto,
  OrderStatus,
  PaymentStatus,
  OrderPaymentStatus,
  CreateOrderDto,
  AddOrderItemsDto,
  UpdateOrderStatusDto,
  UpdateOrderPriorityDto,
  AssignWaiterDto,
  UpdateOrderItemStatusDto,
  OrderItemStatus,
} from './dto';
import { EventsGateway } from '../events/events.gateway';
import { TablesService } from '../tables/tables.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    @Inject(forwardRef(() => TablesService))
    private readonly tablesService: TablesService,
  ) {}

  // ============================================
  // Order Number Generation
  // ============================================

  /**
   * Generate unique order number format: ORD-{YYYYMMDD}-{TENANT_SHORT}-{SEQUENCE}
   */
  private async generateOrderNumber(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const tenantShort = (tenant?.slug || 'XXX').slice(0, 6).toUpperCase();

    // Get the count of orders for today for this tenant
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todayOrderCount = await this.prisma.order.count({
      where: {
        tenantId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const sequence = String(todayOrderCount + 1).padStart(4, '0');
    return `ORD-${dateStr}-${tenantShort}-${sequence}`;
  }

  // ============================================
  // Order CRUD Operations
  // ============================================

  /**
   * Get paginated list of orders with filtering
   */
  async findAll(tenantId: string, query: QueryOrdersDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      priority,
      payment_status,
      table_id,
      zone_id,
      waiter_id,
      date_from,
      date_to,
      sort_by = 'createdAt',
      sort_order = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.OrderWhereInput = {
      tenantId,
      ...(search && {
        orderNumber: { contains: search, mode: 'insensitive' },
      }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(table_id && { tableId: table_id }),
      ...(zone_id && {
        table: { zoneId: zone_id },
      }),
      ...(waiter_id && { waiterId: waiter_id }),
      ...(date_from || date_to
        ? {
            createdAt: {
              ...(date_from && { gte: new Date(date_from) }),
              ...(date_to && { lte: new Date(date_to + 'T23:59:59.999Z') }),
            },
          }
        : {}),
    };

    // Add payment status filter (requires checking payment records)
    let paymentStatusFilter: Prisma.OrderWhereInput | undefined;
    if (payment_status) {
      if (payment_status === PaymentStatus.PAID) {
        paymentStatusFilter = {
          payments: { some: { status: 'completed' } },
        };
      } else if (payment_status === PaymentStatus.UNPAID) {
        paymentStatusFilter = {
          OR: [
            { payments: { none: {} } },
            { payments: { every: { status: { not: 'completed' } } } },
          ],
        };
      }
    }

    const finalWhere = paymentStatusFilter
      ? { AND: [where, paymentStatusFilter] }
      : where;

    // Build orderBy
    const sortFieldMap: Record<string, string> = {
      orderNumber: 'orderNumber',
      status: 'status',
      totalAmount: 'totalAmount',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };

    const orderBy: Prisma.OrderOrderByWithRelationInput = {
      [sortFieldMap[sort_by] || 'createdAt']: sort_order,
    };

    // Execute queries
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: finalWhere,
        skip,
        take: limit,
        orderBy,
        include: {
          table: {
            select: {
              id: true,
              tableNumber: true,
              zone: { select: { id: true, name: true } },
            },
          },
          waiter: {
            select: { id: true, fullName: true },
          },
          customer: {
            select: { id: true, fullName: true, email: true },
          },
          items: {
            select: {
              id: true,
              menuItem: {
                select: { id: true, name: true },
              },
              quantity: true,
              status: true,
              subtotal: true,
              unitPrice: true,
              modifiersTotal: true,
              specialInstructions: true,
              modifiers: {
                select: {
                  id: true,
                  modifierName: true,
                  priceAdjustment: true,
                },
              },
            },
          },
          payments: {
            select: {
              id: true,
              status: true,
              paymentMethod: true,
              amount: true,
              paidAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { items: true },
          },
        },
      }),
      this.prisma.order.count({ where: finalWhere }),
    ]);

    // Transform orders to include payment status
    const transformedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      priority: order.priority,
      paymentStatus: this.getPaymentStatus(order.payments),
      paymentRequestedAt: order.paymentRequestedAt,
      paymentMethod: order.paymentMethod,
      table: order.table,
      waiter: order.waiter,
      customer: order.customer,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        status: item.status,
        subtotal: Number(item.subtotal),
        unitPrice: Number(item.unitPrice),
        modifiersTotal: Number(item.modifiersTotal),
        specialInstructions: item.specialInstructions,
        modifiers: item.modifiers.map((mod) => ({
          id: mod.id,
          modifierName: mod.modifierName,
          priceAdjustment: Number(mod.priceAdjustment),
        })),
      })),
      itemCount: order._count.items,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      specialInstructions: order.specialInstructions,
      payments: order.payments.map((payment) => ({
        id: payment.id,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        amount: Number(payment.amount),
        paidAt: payment.paidAt,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    return {
      success: true,
      data: transformedOrders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single order by ID
   */
  async findOne(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            zone: { select: { id: true, name: true } },
          },
        },
        tableSession: {
          select: {
            id: true,
            startedAt: true,
            status: true,
          },
        },
        waiter: {
          select: { id: true, fullName: true, email: true },
        },
        customer: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                description: true,
                images: {
                  select: { imageUrl: true },
                  orderBy: { displayOrder: 'asc' },
                  take: 1,
                },
              },
            },
            modifiers: {
              select: {
                id: true,
                modifierName: true,
                priceAdjustment: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        priority: order.priority,
        paymentStatus: this.getPaymentStatus(order.payments),
        paymentRequestedAt: order.paymentRequestedAt,
        paymentMethod: order.paymentMethod,
        table: order.table,
        tableSession: order.tableSession,
        waiter: order.waiter,
        customer: order.customer,
        items: order.items.map((item) => ({
          id: item.id,
          menuItem: {
            id: item.menuItem.id,
            name: item.menuItem.name,
            description: item.menuItem.description,
            image: item.menuItem.images[0]?.imageUrl,
          },
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          modifiersTotal: Number(item.modifiersTotal),
          subtotal: Number(item.subtotal),
          status: item.status,
          specialInstructions: item.specialInstructions,
          modifiers: item.modifiers.map((mod) => ({
            id: mod.id,
            name: mod.modifierName,
            priceAdjustment: Number(mod.priceAdjustment),
          })),
          preparationStartedAt: item.preparationStartedAt,
          preparationCompletedAt: item.preparationCompletedAt,
          servedAt: item.servedAt,
          createdAt: item.createdAt,
        })),
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        discountAmount: Number(order.discountAmount),
        totalAmount: Number(order.totalAmount),
        specialInstructions: order.specialInstructions,
        rejectionReason: order.rejectionReason,
        acceptedAt: order.acceptedAt,
        completedAt: order.completedAt,
        statusHistory: order.statusHistory,
        payments: order.payments,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    };
  }

  /**
   * Get paginated list of orders for a specific customer (order history)
   */
  async getMyOrders(customerId: string, query: QueryMyOrdersDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      payment_status,
      date_from,
      date_to,
      sort_by = 'createdAt',
      sort_order = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause - filter by customerId
    const where: Prisma.OrderWhereInput = {
      customerId,
      ...(search && {
        orderNumber: { contains: search, mode: 'insensitive' },
      }),
      ...(status && { status }),
      ...(date_from || date_to
        ? {
            createdAt: {
              ...(date_from && { gte: new Date(date_from) }),
              ...(date_to && { lte: new Date(date_to + 'T23:59:59.999Z') }),
            },
          }
        : {}),
    };

    // Add payment status filter
    let paymentStatusFilter: Prisma.OrderWhereInput | undefined;
    if (payment_status) {
      if (payment_status === PaymentStatus.PAID) {
        paymentStatusFilter = {
          payments: { some: { status: 'completed' } },
        };
      } else if (payment_status === PaymentStatus.UNPAID) {
        paymentStatusFilter = {
          OR: [
            { payments: { none: {} } },
            { payments: { every: { status: { not: 'completed' } } } },
          ],
        };
      }
    }

    const finalWhere = paymentStatusFilter
      ? { AND: [where, paymentStatusFilter] }
      : where;

    // Build orderBy
    const sortFieldMap: Record<string, string> = {
      orderNumber: 'orderNumber',
      status: 'status',
      totalAmount: 'totalAmount',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };

    const orderBy: Prisma.OrderOrderByWithRelationInput = {
      [sortFieldMap[sort_by] || 'createdAt']: sort_order,
    };

    // Execute queries
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: finalWhere,
        skip,
        take: limit,
        orderBy,
        include: {
          table: {
            select: {
              id: true,
              tableNumber: true,
              zone: { select: { id: true, name: true } },
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          items: {
            select: {
              id: true,
              menuItem: {
                select: { id: true, name: true },
              },
              quantity: true,
              status: true,
              subtotal: true,
            },
          },
          payments: {
            select: {
              id: true,
              status: true,
              paymentMethod: true,
              amount: true,
              paidAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { items: true },
          },
        },
      }),
      this.prisma.order.count({ where: finalWhere }),
    ]);

    // Transform orders to include payment status
    const transformedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      priority: order.priority,
      paymentStatus: this.getPaymentStatus(order.payments),
      table: order.table,
      tenant: order.tenant,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        status: item.status,
        subtotal: Number(item.subtotal),
      })),
      itemCount: order._count.items,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      specialInstructions: order.specialInstructions,
      payments: order.payments.map((payment) => ({
        id: payment.id,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        amount: Number(payment.amount),
        paidAt: payment.paidAt,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    return {
      success: true,
      data: transformedOrders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get order details by ID for a specific customer
   */
  async getMyOrderById(customerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
      },
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            zone: { select: { id: true, name: true } },
          },
        },
        tableSession: {
          select: {
            id: true,
            startedAt: true,
            status: true,
          },
        },
        waiter: {
          select: { id: true, fullName: true, email: true },
        },
        customer: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                description: true,
                images: {
                  select: { imageUrl: true },
                  orderBy: { displayOrder: 'asc' },
                  take: 1,
                },
              },
            },
            modifiers: {
              select: {
                id: true,
                modifierName: true,
                priceAdjustment: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or does not belong to you');
    }

    return {
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        priority: order.priority,
        paymentStatus: this.getPaymentStatus(order.payments),
        table: order.table,
        tableSession: order.tableSession,
        waiter: order.waiter,
        customer: order.customer,
        items: order.items.map((item) => ({
          id: item.id,
          menuItem: {
            id: item.menuItem.id,
            name: item.menuItem.name,
            description: item.menuItem.description,
            image: item.menuItem.images[0]?.imageUrl,
          },
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          modifiersTotal: Number(item.modifiersTotal),
          subtotal: Number(item.subtotal),
          status: item.status,
          specialInstructions: item.specialInstructions,
          modifiers: item.modifiers.map((mod) => ({
            id: mod.id,
            name: mod.modifierName,
            priceAdjustment: Number(mod.priceAdjustment),
          })),
          preparationStartedAt: item.preparationStartedAt,
          preparationCompletedAt: item.preparationCompletedAt,
          servedAt: item.servedAt,
          createdAt: item.createdAt,
        })),
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        discountAmount: Number(order.discountAmount),
        totalAmount: Number(order.totalAmount),
        specialInstructions: order.specialInstructions,
        rejectionReason: order.rejectionReason,
        acceptedAt: order.acceptedAt,
        completedAt: order.completedAt,
        statusHistory: order.statusHistory,
        payments: order.payments,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    };
  }

  /**
   * Create order or add items to existing order (Single Order Per Session pattern)
   *
   * Business Logic:
   * - If session has NO active order → Create new order
   * - If session HAS active order → Append items to existing order (auto-delegate to addItems)
   * - If payment is initiated → Block with ConflictException
   *
   * This ensures:
   * - Only 1 active order per table session (as per project description)
   * - Customers can add items throughout their meal
   * - KDS/Waiter sees 1 consolidated bill per table
   */
  async create(
    tenantId: string,
    tableSessionId: string,
    createOrderDto: CreateOrderDto,
    customerId?: string,
    deviceId?: string,
  ) {
    const { items, special_instructions, device_id } = createOrderDto;
    const effectiveDeviceId = deviceId || device_id;

    // 1. Validate table session
    const session = await this.prisma.tableSession.findFirst({
      where: {
        id: tableSessionId,
        status: 'active',
        table: { tenantId },
      },
      include: {
        table: true,
        orders: {
          where: {
            status: {
              notIn: ['completed', 'cancelled', 'rejected', 'abandoned'],
            },
          },
          include: {
            payments: {
              where: {
                status: { in: ['pending', 'processing'] },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Active table session not found');
    }

    // 2. Check if there's already an active order for this session
    const existingOrder = session.orders[0];

    if (existingOrder) {
      // 2a. Check payment lock - cannot add items after payment initiated
      if (existingOrder.payments && existingOrder.payments.length > 0) {
        throw new ConflictException(
          'Cannot add items after payment has been initiated. Please contact staff for assistance.',
        );
      }

      // 2b. Also check paymentStatus field (new field)
      if (
        existingOrder.paymentStatus &&
        existingOrder.paymentStatus !== OrderPaymentStatus.NONE &&
        existingOrder.paymentStatus !== OrderPaymentStatus.FAILED
      ) {
        throw new ConflictException(
          'Cannot add items after payment has been initiated. Please contact staff for assistance.',
        );
      }

      // 2c. Append items to existing order (auto-delegate)
      this.logger.log(
        `Session ${tableSessionId} has existing order ${existingOrder.orderNumber}, appending items`,
      );

      return this.addItems(
        tenantId,
        existingOrder.id,
        { items },
        customerId,
        effectiveDeviceId,
      );
    }

    // 3. Validate and get menu items with prices
    const menuItemIds = items.map((item) => item.menu_item_id);
    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        tenantId,
        status: 'available',
      },
      include: {
        modifierGroups: {
          include: {
            modifierGroup: {
              include: {
                modifiers: true,
              },
            },
          },
        },
      },
    });

    if (menuItems.length !== menuItemIds.length) {
      throw new BadRequestException('One or more menu items are not available');
    }

    // Create a map for easy lookup
    const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

    // 4. Generate order number
    const orderNumber = await this.generateOrderNumber(tenantId);

    // 5. Calculate totals and create order with items
    let subtotal = 0;
    const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];
    const orderItemModifiersData: {
      orderItemIndex: number;
      modifiers: Prisma.OrderItemModifierCreateManyOrderItemInput[];
    }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const menuItem = menuItemMap.get(item.menu_item_id)!;
      const unitPrice = Number(menuItem.basePrice);
      let modifiersTotal = 0;

      // Validate and calculate modifiers
      const modifierData: Prisma.OrderItemModifierCreateManyOrderItemInput[] =
        [];
      if (item.modifiers && item.modifiers.length > 0) {
        for (const modSelection of item.modifiers) {
          // Find the modifier in the menu item's modifier groups
          let foundModifier: any = null;
          for (const itemModGroup of menuItem.modifierGroups) {
            foundModifier = itemModGroup.modifierGroup.modifiers.find(
              (m) => m.id === modSelection.modifier_id,
            );
            if (foundModifier) break;
          }

          if (!foundModifier) {
            throw new BadRequestException(
              `Invalid modifier: ${modSelection.modifier_id}`,
            );
          }

          modifiersTotal += Number(foundModifier.priceAdjustment);
          modifierData.push({
            modifierId: foundModifier.id,
            modifierName: foundModifier.name,
            priceAdjustment: foundModifier.priceAdjustment,
          });
        }
      }

      const itemSubtotal = (unitPrice + modifiersTotal) * item.quantity;
      subtotal += itemSubtotal;

      orderItemsData.push({
        menuItemId: item.menu_item_id,
        quantity: item.quantity,
        unitPrice: menuItem.basePrice,
        modifiersTotal,
        subtotal: itemSubtotal,
        status: 'pending',
        specialInstructions: item.special_instructions,
        estimatedPrepTime: menuItem.preparationTime,
        // Multi-device tracking
        createdByDeviceId: effectiveDeviceId,
        createdByCustomerId: customerId,
      });

      orderItemModifiersData.push({
        orderItemIndex: i,
        modifiers: modifierData,
      });
    }

    // Calculate tax (10% VAT for Vietnam)
    const taxRate = 0.1;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    // 6. Create order with items in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Create the order with payment status field
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          tenantId,
          tableId: session.tableId,
          tableSessionId: session.id,
          customerId,
          status: 'pending',
          priority: 'normal',
          paymentStatus: OrderPaymentStatus.NONE, // New field
          subtotal,
          taxAmount,
          discountAmount: 0,
          totalAmount,
          specialInstructions: special_instructions,
        },
      });

      // Create order items
      const createdItems = await Promise.all(
        orderItemsData.map((itemData) =>
          tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              ...itemData,
            },
          }),
        ),
      );

      // Create order item modifiers
      for (let i = 0; i < createdItems.length; i++) {
        const modifiers = orderItemModifiersData[i].modifiers;
        if (modifiers.length > 0) {
          await tx.orderItemModifier.createMany({
            data: modifiers.map((mod) => ({
              orderItemId: createdItems[i].id,
              ...mod,
            })),
          });
        }
      }

      // Create initial status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          toStatus: 'pending',
          notes: 'Order placed by customer',
        },
      });

      // Update table status to occupied
      await tx.table.update({
        where: { id: session.tableId },
        data: { status: 'occupied' },
      });

      return newOrder;
    });

    this.logger.log(
      `Order ${orderNumber} created for table ${session.table.tableNumber}`,
    );

    // Extend session expiry from 15 min to 4 hours now that order is placed
    await this.tablesService.extendSessionForOrder(tableSessionId);

    // Get the full order and emit real-time event
    const result = await this.findOne(tenantId, order.id);

    // Emit real-time event to notify staff
    this.eventsGateway.emitOrderCreated(tenantId, result.data);

    return result;
  }

  /**
   * Add items to an existing order
   *
   * Business Rules:
   * - Order must be active (not completed/cancelled/rejected/abandoned)
   * - Payment must NOT be initiated (paymentStatus = none or failed)
   * - Tracks which device/customer added each item for multi-device support
   */
  async addItems(
    tenantId: string,
    orderId: string,
    addItemsDto: AddOrderItemsDto,
    customerId?: string,
    deviceId?: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
        status: { notIn: ['completed', 'cancelled', 'rejected', 'abandoned'] },
      },
      include: {
        tableSession: true,
        payments: {
          where: {
            status: { in: ['pending', 'processing'] },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or cannot be modified');
    }

    // Check payment lock via Payment records
    if (order.payments && order.payments.length > 0) {
      throw new ConflictException(
        'Cannot add items after payment has been initiated. Please contact staff for assistance.',
      );
    }

    // Check payment lock via paymentStatus field (new field)
    if (
      order.paymentStatus &&
      order.paymentStatus !== OrderPaymentStatus.NONE &&
      order.paymentStatus !== OrderPaymentStatus.FAILED
    ) {
      throw new ConflictException(
        'Cannot add items after payment has been initiated. Please contact staff for assistance.',
      );
    }

    // Note: We don't validate customerId strictly anymore
    // Multiple customers at same table can add items to the same order
    // We track who added what via createdByCustomerId field

    // Similar logic to create, but add to existing order
    const { items } = addItemsDto;

    // Validate menu items
    const menuItemIds = items.map((item) => item.menu_item_id);
    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        tenantId,
        status: 'available',
      },
      include: {
        modifierGroups: {
          include: {
            modifierGroup: {
              include: {
                modifiers: true,
              },
            },
          },
        },
      },
    });

    if (menuItems.length !== menuItemIds.length) {
      throw new BadRequestException('One or more menu items are not available');
    }

    const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

    // Calculate new items
    let additionalSubtotal = 0;
    const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];
    const orderItemModifiersData: {
      orderItemIndex: number;
      modifiers: Prisma.OrderItemModifierCreateManyOrderItemInput[];
    }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const menuItem = menuItemMap.get(item.menu_item_id)!;
      const unitPrice = Number(menuItem.basePrice);
      let modifiersTotal = 0;

      const modifierData: Prisma.OrderItemModifierCreateManyOrderItemInput[] =
        [];
      if (item.modifiers && item.modifiers.length > 0) {
        for (const modSelection of item.modifiers) {
          let foundModifier: any = null;
          for (const itemModGroup of menuItem.modifierGroups) {
            foundModifier = itemModGroup.modifierGroup.modifiers.find(
              (m) => m.id === modSelection.modifier_id,
            );
            if (foundModifier) break;
          }

          if (!foundModifier) {
            throw new BadRequestException(
              `Invalid modifier: ${modSelection.modifier_id}`,
            );
          }

          modifiersTotal += Number(foundModifier.priceAdjustment);
          modifierData.push({
            modifierId: foundModifier.id,
            modifierName: foundModifier.name,
            priceAdjustment: foundModifier.priceAdjustment,
          });
        }
      }

      const itemSubtotal = (unitPrice + modifiersTotal) * item.quantity;
      additionalSubtotal += itemSubtotal;

      orderItemsData.push({
        menuItemId: item.menu_item_id,
        quantity: item.quantity,
        unitPrice: menuItem.basePrice,
        modifiersTotal,
        subtotal: itemSubtotal,
        status: 'pending',
        specialInstructions: item.special_instructions,
        estimatedPrepTime: menuItem.preparationTime,
        // Multi-device tracking: who added this item
        createdByDeviceId: deviceId,
        createdByCustomerId: customerId,
      });

      orderItemModifiersData.push({
        orderItemIndex: i,
        modifiers: modifierData,
      });
    }

    // Calculate new totals
    const newSubtotal = Number(order.subtotal) + additionalSubtotal;
    const taxRate = 0.1;
    const newTaxAmount = newSubtotal * taxRate;
    const newTotalAmount =
      newSubtotal + newTaxAmount - Number(order.discountAmount);

    // Update order in transaction
    await this.prisma.$transaction(async (tx) => {
      // Create order items
      const createdItems = await Promise.all(
        orderItemsData.map((itemData) =>
          tx.orderItem.create({
            data: {
              orderId: order.id,
              ...itemData,
            },
          }),
        ),
      );

      // Create order item modifiers
      for (let i = 0; i < createdItems.length; i++) {
        const modifiers = orderItemModifiersData[i].modifiers;
        if (modifiers.length > 0) {
          await tx.orderItemModifier.createMany({
            data: modifiers.map((mod) => ({
              orderItemId: createdItems[i].id,
              ...mod,
            })),
          });
        }
      }

      // Update order totals
      await tx.order.update({
        where: { id: order.id },
        data: {
          subtotal: newSubtotal,
          taxAmount: newTaxAmount,
          totalAmount: newTotalAmount,
        },
      });

      // Add status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          notes: `Added ${items.length} item(s) to order`,
        },
      });
    });

    this.logger.log(
      `Added ${items.length} items to order ${order.orderNumber}`,
    );

    // Get the full order and emit real-time event
    const result = await this.findOne(tenantId, order.id);

    // Emit real-time event
    this.eventsGateway.emitItemsAdded(tenantId, order.id, result.data);

    return result;
  }

  /**
   * Update order status (waiter/admin action)
   */
  async updateStatus(
    tenantId: string,
    orderId: string,
    updateStatusDto: UpdateOrderStatusDto,
    userId: string,
  ) {
    const { status, rejection_reason, notes } = updateStatusDto;

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      pending: ['accepted', 'rejected', 'cancelled'],
      accepted: ['in_progress', 'cancelled'],
      in_progress: ['ready', 'cancelled'],
      ready: ['served', 'cancelled'],
      served: ['completed'],
      completed: [],
      rejected: [],
      cancelled: [],
      abandoned: [],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${status}`,
      );
    }

    // Require rejection reason when rejecting
    if (status === OrderStatus.REJECTED && !rejection_reason) {
      throw new BadRequestException(
        'Rejection reason is required when rejecting an order',
      );
    }

    // Update order
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status,
          rejectionReason:
            status === OrderStatus.REJECTED ? rejection_reason : undefined,
          acceptedAt:
            status === OrderStatus.ACCEPTED ? new Date() : order.acceptedAt,
          completedAt:
            status === OrderStatus.COMPLETED ? new Date() : order.completedAt,
          waiterId:
            status === OrderStatus.ACCEPTED && !order.waiterId
              ? userId
              : order.waiterId,
        },
      });

      // Create status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: status,
          changedBy: userId,
          notes: notes || rejection_reason,
        },
      });

      // If accepted, update all pending items to accepted
      if (status === OrderStatus.ACCEPTED) {
        await tx.orderItem.updateMany({
          where: { orderId, status: 'pending' },
          data: { status: 'accepted' },
        });
      }

      // If served, update all ready items to served
      if (status === OrderStatus.SERVED) {
        await tx.orderItem.updateMany({
          where: { orderId, status: 'ready' },
          data: { status: 'served', servedAt: new Date() },
        });
      }

      return updated;
    });

    this.logger.log(
      `Order ${order.orderNumber} status changed from ${order.status} to ${status}`,
    );

    // Get the full order and emit real-time event
    const result = await this.findOne(tenantId, updatedOrder.id);

    // Emit real-time event to notify all connected clients
    this.eventsGateway.emitOrderUpdated(tenantId, updatedOrder.id, result.data);

    // If order status changed to served, emit item:status events for all served items
    // This ensures customer frontend gets notified of item status changes
    if (status === OrderStatus.SERVED) {
      const servedItems = await this.prisma.orderItem.findMany({
        where: { orderId, status: 'served' },
        include: {
          menuItem: { select: { id: true, name: true } },
          order: { include: { table: true } },
        },
      });

      for (const item of servedItems) {
        this.eventsGateway.emitItemStatusChanged(
          tenantId,
          orderId,
          item.id,
          item,
        );
      }
    }

    return result;
  }

  /**
   * Update order item status (kitchen action)
   */
  async updateItemStatus(
    tenantId: string,
    orderId: string,
    itemId: string,
    updateStatusDto: UpdateOrderItemStatusDto,
    userId?: string,
  ) {
    const { status, cancellation_reason } = updateStatusDto;

    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: itemId,
        orderId,
        order: { tenantId },
      },
      include: {
        order: {
          include: { table: true },
        },
        menuItem: true, // Include menuItem to get name for notifications
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      pending: ['accepted', 'cancelled'],
      accepted: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['served'],
      served: ['returned'],
      cancelled: [],
      returned: [],
    };

    if (!validTransitions[orderItem.status]?.includes(status)) {
      throw new BadRequestException(
        `Cannot transition item from ${orderItem.status} to ${status}`,
      );
    }

    // Require reason for cancellation
    if (status === OrderItemStatus.CANCELLED && !cancellation_reason) {
      throw new BadRequestException(
        'Cancellation reason is required when cancelling an item',
      );
    }

    // Update item
    const now = new Date();
    const updatedItem = await this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status,
        cancellationReason:
          status === OrderItemStatus.CANCELLED
            ? cancellation_reason
            : undefined,
        preparationStartedAt:
          status === OrderItemStatus.PREPARING
            ? now
            : orderItem.preparationStartedAt,
        preparationCompletedAt:
          status === OrderItemStatus.READY
            ? now
            : orderItem.preparationCompletedAt,
        servedAt: status === OrderItemStatus.SERVED ? now : orderItem.servedAt,
        actualPrepTime:
          status === OrderItemStatus.READY && orderItem.preparationStartedAt
            ? Math.floor(
                (now.getTime() - orderItem.preparationStartedAt.getTime()) /
                  60000,
              )
            : orderItem.actualPrepTime,
      },
    });

    // Update order status based on items
    await this.updateOrderStatusFromItems(orderItem.orderId);

    this.logger.log(
      `Order item ${itemId} status changed from ${orderItem.status} to ${status}`,
    );

    // Emit real-time event for item status change
    this.eventsGateway.emitItemStatusChanged(tenantId, orderId, itemId, {
      ...updatedItem,
      menuItem: orderItem.menuItem, // Pass menuItem for name
      order: orderItem.order, // Pass order for table info
    });

    return {
      success: true,
      data: {
        id: updatedItem.id,
        status: updatedItem.status,
        preparationStartedAt: updatedItem.preparationStartedAt,
        preparationCompletedAt: updatedItem.preparationCompletedAt,
        servedAt: updatedItem.servedAt,
      },
    };
  }

  /**
   * Get order statistics
   */
  async getStats(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedToday,
      todayRevenue,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { tenantId, status: { notIn: ['cancelled', 'rejected'] } },
      }),
      this.prisma.order.count({
        where: { tenantId, status: 'pending' },
      }),
      this.prisma.order.count({
        where: {
          tenantId,
          status: { in: ['accepted', 'in_progress', 'ready'] },
        },
      }),
      this.prisma.order.count({
        where: {
          tenantId,
          status: 'completed',
          completedAt: { gte: today },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          tenantId,
          status: 'completed',
          completedAt: { gte: today },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        inProgressOrders,
        completedToday,
        todayRevenue: Number(todayRevenue._sum.totalAmount || 0),
      },
    };
  }

  /**
   * Get current order for a table session (customer)
   * Returns the single active order for the session (single order per session pattern)
   */
  async getMyOrder(tableSessionId: string, tenantId: string) {
    // Find active order for this session
    const order = await this.prisma.order.findFirst({
      where: {
        tableSessionId,
        tenantId,
        status: {
          notIn: ['completed', 'cancelled', 'rejected', 'abandoned'],
        },
      },
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            zone: { select: { id: true, name: true } },
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                description: true,
                images: {
                  select: { imageUrl: true },
                  orderBy: { displayOrder: 'asc' },
                  take: 1,
                },
              },
            },
            modifiers: {
              select: {
                id: true,
                modifierName: true,
                priceAdjustment: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      return {
        success: true,
        data: null,
        message: 'No active order found for this session',
      };
    }

    return {
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        priority: order.priority,
        paymentStatus:
          order.paymentStatus || this.getPaymentStatus(order.payments),
        canAddItems: this.canAddItems(order),
        table: order.table,
        items: order.items.map((item) => ({
          id: item.id,
          menuItem: {
            id: item.menuItem.id,
            name: item.menuItem.name,
            description: item.menuItem.description,
            image: item.menuItem.images[0]?.imageUrl,
          },
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          modifiersTotal: Number(item.modifiersTotal),
          subtotal: Number(item.subtotal),
          status: item.status,
          specialInstructions: item.specialInstructions,
          modifiers: item.modifiers.map((mod) => ({
            id: mod.id,
            name: mod.modifierName,
            priceAdjustment: Number(mod.priceAdjustment),
          })),
          // Multi-device tracking
          createdByDeviceId: item.createdByDeviceId,
          createdByCustomerId: item.createdByCustomerId,
          createdAt: item.createdAt,
        })),
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        discountAmount: Number(order.discountAmount),
        totalAmount: Number(order.totalAmount),
        specialInstructions: order.specialInstructions,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    };
  }

  /**
   * Check if items can be added to an order
   * Returns false if payment has been initiated
   */
  private canAddItems(order: {
    paymentStatus?: string;
    payments?: { status: string }[];
  }): boolean {
    // Check paymentStatus field
    if (
      order.paymentStatus &&
      order.paymentStatus !== OrderPaymentStatus.NONE &&
      order.paymentStatus !== OrderPaymentStatus.FAILED
    ) {
      return false;
    }

    // Check Payment records (legacy)
    if (
      order.payments &&
      order.payments.some(
        (p) => p.status === 'pending' || p.status === 'processing',
      )
    ) {
      return false;
    }

    return true;
  }

  /**
   * Get current order for session (alias for consistent API naming)
   * Used by /orders/current endpoint
   */
  async getCurrentOrder(tableSessionId: string, tenantId: string) {
    return this.getMyOrder(tableSessionId, tenantId);
  }

  /**
   * Add items to current order (create-or-append pattern)
   * Used by POST /orders/current/items endpoint
   */
  async addItemsToCurrentOrder(
    tenantId: string,
    tableSessionId: string,
    addItemsDto: AddOrderItemsDto,
    customerId?: string,
    deviceId?: string,
  ) {
    // First, get or find current order
    const session = await this.prisma.tableSession.findFirst({
      where: {
        id: tableSessionId,
        status: 'active',
        table: { tenantId },
      },
      include: {
        orders: {
          where: {
            status: {
              notIn: ['completed', 'cancelled', 'rejected', 'abandoned'],
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Active table session not found');
    }

    const existingOrder = session.orders[0];

    if (!existingOrder) {
      // No order exists, create one
      return this.create(
        tenantId,
        tableSessionId,
        { items: addItemsDto.items, special_instructions: undefined },
        customerId,
        deviceId,
      );
    }

    // Add items to existing order
    return this.addItems(
      tenantId,
      existingOrder.id,
      addItemsDto,
      customerId,
      deviceId,
    );
  }

  // ============================================
  // Helper Methods
  // ============================================

  private getPaymentStatus(payments: { status: string }[]): PaymentStatus {
    if (!payments || payments.length === 0) {
      return PaymentStatus.UNPAID;
    }

    // Check for paid payments
    const hasPaid = payments.some((p) => p.status === 'paid');
    if (hasPaid) {
      return PaymentStatus.PAID;
    }

    // Check for completed payments (legacy support)
    const hasCompleted = payments.some((p) => p.status === 'completed');
    if (hasCompleted) {
      return PaymentStatus.PAID;
    }

    return PaymentStatus.UNPAID;
  }

  /**
   * Auto-update order status based on item statuses
   * Also emits socket event to notify customer
   */
  private async updateOrderStatusFromItems(orderId: string) {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId, status: { not: 'cancelled' } },
      select: { status: true },
    });

    if (items.length === 0) return;

    const statuses = items.map((i) => i.status);

    let newStatus: string | null = null;

    // If all items served -> order served
    if (statuses.every((s) => s === 'served')) {
      newStatus = 'served';
    }
    // If all items ready -> order ready
    else if (statuses.every((s) => s === 'ready' || s === 'served')) {
      newStatus = 'ready';
    }
    // If any item is preparing or ready -> order in_progress
    else if (statuses.some((s) => ['preparing', 'ready'].includes(s))) {
      newStatus = 'in_progress';
    }

    if (newStatus) {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true, tenantId: true },
      });

      if (order && order.status !== newStatus && order.status !== 'completed') {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: newStatus },
        });

        // Emit socket event to notify customer of order status change
        this.eventsGateway.emitOrderStatusAutoUpdated(
          order.tenantId,
          orderId,
          newStatus,
        );

        this.logger.log(
          `Order ${orderId} status auto-updated to ${newStatus} based on items`,
        );
      }
    }
  }
}
