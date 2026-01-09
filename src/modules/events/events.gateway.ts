import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';

/**
 * WebSocket Gateway for real-time order events
 *
 * Authentication:
 * - Staff (admin/waiter/kitchen): JWT token via query.accessToken
 * - Customer/Guest: Session token via query.sessionToken
 *
 * Rooms:
 * - tenant:{tenantId} - All orders for a restaurant (staff)
 * - tenant:{tenantId}:waiters - Waiter-specific notifications
 * - tenant:{tenantId}:kitchen - Kitchen-specific notifications
 * - order:{orderId} - Specific order updates (customer)
 */
@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000', // admin frontend
      'http://localhost:3002', // customer frontend
      process.env.FRONTEND_URL,
      process.env.CUSTOMER_FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  },
  namespace: '/orders',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  // Track connected clients by tenant for broadcasting
  private tenantClients = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const { sessionToken, accessToken } = client.handshake.query as {
        sessionToken?: string;
        accessToken?: string;
      };

      // 1. If accessToken exists, validate JWT (staff user)
      if (accessToken) {
        const user = await this.validateJwtToken(accessToken);

        if (user && user.tenantId) {
          // Staff user - join tenant rooms based on role
          client.join(`tenant:${user.tenantId}`);

          if (user.role === 'waiter') {
            client.join(`tenant:${user.tenantId}:waiters`);
          } else if (user.role === 'kitchen_staff') {
            client.join(`tenant:${user.tenantId}:kitchen`);
          }

          // Store user info on socket for later use
          client.data.user = user;
          client.data.type = 'staff';

          // Track client by tenant
          this.addClientToTenant(user.tenantId, client.id);

          this.logger.log(
            `Staff ${user.email} (${user.role}) connected to tenant:${user.tenantId}`,
          );
          return;
        }
      }

      // 2. If sessionToken exists, validate session (guest/customer)
      if (sessionToken) {
        const session = await this.validateSessionToken(sessionToken);

        if (session) {
          // Get tenant ID from table
          const table = await this.prisma.table.findUnique({
            where: { id: session.tableId },
            select: { tenantId: true },
          });

          if (table) {
            // Join order room if there's an active order
            const activeOrder = await this.prisma.order.findFirst({
              where: {
                tableSessionId: session.id,
                status: {
                  notIn: ['completed', 'cancelled', 'rejected', 'abandoned'],
                },
              },
            });

            if (activeOrder) {
              client.join(`order:${activeOrder.id}`);
            }

            // Store session info on socket
            client.data.session = session;
            client.data.tenantId = table.tenantId;
            client.data.type = 'customer';

            this.logger.log(
              `Customer connected for table session ${session.id}`,
            );
            return;
          }
        }
      }

      // No valid authentication - disconnect
      this.logger.warn(`Unauthorized connection attempt from ${client.id}`);
      client.disconnect();
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Remove from tenant tracking
    if (client.data.user?.tenantId) {
      this.removeClientFromTenant(client.data.user.tenantId, client.id);
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ============================================
  // Message Handlers
  // ============================================

  /**
   * Customer joins a specific order room after creating an order
   */
  @SubscribeMessage('joinOrder')
  async handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const { orderId } = data;

    // Verify the customer has access to this order
    if (client.data.type === 'customer' && client.data.session) {
      const order = await this.prisma.order.findFirst({
        where: {
          id: orderId,
          tableSessionId: client.data.session.id,
        },
      });

      if (order) {
        client.join(`order:${orderId}`);
        this.logger.log(`Customer joined order room: order:${orderId}`);
        return { success: true };
      }
    }

    return { success: false, error: 'Unauthorized' };
  }

  /**
   * Staff subscribes to kitchen updates
   */
  @SubscribeMessage('subscribeKitchen')
  handleSubscribeKitchen(@ConnectedSocket() client: Socket) {
    if (client.data.type === 'staff' && client.data.user?.tenantId) {
      client.join(`tenant:${client.data.user.tenantId}:kitchen`);
      return { success: true };
    }
    return { success: false };
  }

  // ============================================
  // Event Emission Methods (called by OrdersService)
  // ============================================

  /**
   * Emit when new order is created
   */
  emitOrderCreated(tenantId: string, order: any) {
    // Notify all staff in the tenant
    this.server.to(`tenant:${tenantId}`).emit('order:created', {
      type: 'order:created',
      data: order,
      timestamp: new Date().toISOString(),
    });

    // Notify waiters specifically
    this.server.to(`tenant:${tenantId}:waiters`).emit('order:new', {
      type: 'order:new',
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        table: order.table,
        itemCount: order.items?.length || 0,
        totalAmount: order.totalAmount,
      },
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Emitted order:created for ${order.orderNumber}`);
  }

  /**
   * Emit when order status changes
   */
  emitOrderUpdated(tenantId: string, orderId: string, order: any) {
    // Notify all staff in the tenant
    this.server.to(`tenant:${tenantId}`).emit('order:updated', {
      type: 'order:updated',
      data: order,
      timestamp: new Date().toISOString(),
    });

    // Notify the specific order room (customer)
    this.server.to(`order:${orderId}`).emit('order:status', {
      type: 'order:status',
      data: {
        id: order.id,
        status: order.status,
        items: order.items,
      },
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Emitted order:updated for ${order.orderNumber}`);
  }

  /**
   * Emit when items are added to an order
   */
  emitItemsAdded(tenantId: string, orderId: string, order: any) {
    // Notify staff
    this.server.to(`tenant:${tenantId}`).emit('order:items:added', {
      type: 'order:items:added',
      data: order,
      timestamp: new Date().toISOString(),
    });

    // Notify customer
    this.server.to(`order:${orderId}`).emit('order:items:added', {
      type: 'order:items:added',
      data: {
        id: order.id,
        items: order.items,
        totalAmount: order.totalAmount,
      },
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Emitted order:items:added for order ${orderId}`);
  }

  /**
   * Emit when individual item status changes
   * Notifies: Kitchen, Waiters, and Customer
   */
  emitItemStatusChanged(
    tenantId: string,
    orderId: string,
    itemId: string,
    item: any,
  ) {
    const eventData = {
      type: 'item:status',
      data: {
        orderId,
        itemId,
        status: item.status,
        menuItemName: item.menuItem?.name,
        table: item.order?.table,
      },
      timestamp: new Date().toISOString(),
    };

    // Notify ALL staff in tenant (Admin, Owner, etc.)
    this.server.to(`tenant:${tenantId}`).emit('item:status', eventData);

    // Also notify kitchen specifically (they're in both rooms, but this ensures delivery)
    this.server.to(`tenant:${tenantId}:kitchen`).emit('item:status', eventData);

    // Also notify waiters specifically
    this.server.to(`tenant:${tenantId}:waiters`).emit('item:status', eventData);

    // Special notification when item is ready (for waiter to serve)
    if (item.status === 'ready') {
      this.server.to(`tenant:${tenantId}:waiters`).emit('item:ready', {
        type: 'item:ready',
        data: {
          orderId,
          itemId,
          menuItemName: item.menuItem?.name,
          table: item.order?.table,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Notify customer watching this order
    this.server.to(`order:${orderId}`).emit('item:status', {
      type: 'item:status',
      data: {
        orderId, // Include orderId so customer frontend can match
        itemId,
        status: item.status,
        itemName: item.menuItem?.name, // Include item name for display
      },
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Emitted item:status for ${item.menuItem?.name} -> ${item.status} (order: ${orderId})`,
    );
  }

  /**
   * Emit when order status auto-updates based on item statuses
   * Called when all items reach a certain status (e.g., all items ready -> order ready)
   */
  emitOrderStatusAutoUpdated(
    tenantId: string,
    orderId: string,
    newStatus: string,
  ) {
    // Notify staff
    this.server.to(`tenant:${tenantId}`).emit('order:status', {
      type: 'order:status',
      data: {
        id: orderId,
        status: newStatus,
      },
      timestamp: new Date().toISOString(),
    });

    // Notify customer watching this order
    this.server.to(`order:${orderId}`).emit('order:status', {
      type: 'order:status',
      data: {
        id: orderId,
        status: newStatus,
      },
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Emitted order:status auto-update for order ${orderId} -> ${newStatus}`,
    );
  }

  /**
   * Emit when payment status changes (e.g., QR payment confirmed)
   */
  emitPaymentUpdated(tenantId: string, orderId: string, payment: any) {
    // Notify all staff in the tenant
    this.server.to(`tenant:${tenantId}`).emit('payment:updated', {
      type: 'payment:updated',
      data: {
        orderId,
        paymentId: payment.id,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt,
      },
      timestamp: new Date().toISOString(),
    });

    // Notify customer watching this order
    this.server.to(`order:${orderId}`).emit('payment:updated', {
      type: 'payment:updated',
      data: {
        orderId,
        status: payment.status,
        paidAt: payment.paidAt,
      },
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Emitted payment:updated for order ${orderId} -> ${payment.status}`,
    );
  }

  /**
   * Emit when customer requests bill
   * Notifies: Waiters and all staff
   */
  emitBillRequested(tenantId: string, orderId: string, data: any) {
    const eventData = {
      type: 'bill:requested',
      data: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        tableNumber: data.tableNumber,
        zoneName: data.zoneName,
        totalAmount: data.totalAmount,
        notes: data.notes,
      },
      timestamp: new Date().toISOString(),
    };

    // Notify all staff in tenant
    this.server.to(`tenant:${tenantId}`).emit('bill:requested', eventData);

    // Notify waiters specifically (important notification)
    this.server
      .to(`tenant:${tenantId}:waiters`)
      .emit('bill:requested', eventData);

    this.logger.log(
      `Emitted bill:requested for order ${data.orderNumber} at table ${data.tableNumber}`,
    );
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async validateJwtToken(token: string): Promise<any | null> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          tenantId: true,
          fullName: true,
        },
      });
      return user;
    } catch (error) {
      return null;
    }
  }

  private async validateSessionToken(token: string): Promise<any | null> {
    try {
      const session = await this.prisma.tableSession.findFirst({
        where: {
          sessionToken: token,
          status: 'active',
        },
      });
      return session;
    } catch (error) {
      return null;
    }
  }

  private addClientToTenant(tenantId: string, clientId: string) {
    if (!this.tenantClients.has(tenantId)) {
      this.tenantClients.set(tenantId, new Set());
    }
    this.tenantClients.get(tenantId)!.add(clientId);
  }

  private removeClientFromTenant(tenantId: string, clientId: string) {
    this.tenantClients.get(tenantId)?.delete(clientId);
  }

  /**
   * Get count of connected clients for a tenant
   */
  getConnectedCount(tenantId: string): number {
    return this.tenantClients.get(tenantId)?.size || 0;
  }
}
