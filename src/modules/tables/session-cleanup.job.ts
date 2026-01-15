import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma.service';

/**
 * Cron job to cleanup abandoned/expired table sessions
 *
 * Runs every 5 minutes to:
 * 1. Mark sessions as ABANDONED if:
 *    - Session has no orders AND expiresAt has passed (timeout from tenant settings)
 *    - Session has orders but idle for > 4 hours (no activity)
 * 2. Reset table status to AVAILABLE when session is abandoned
 * 3. Cleanup expired idempotency keys
 */
@Injectable()
export class SessionCleanupJob {
  private readonly logger = new Logger(SessionCleanupJob.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cleanup abandoned sessions every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleSessionCleanup() {
    this.logger.log('Starting session cleanup job...');

    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    try {
      // 1. Find sessions that should be abandoned
      const sessionsToAbandon = await this.prisma.tableSession.findMany({
        where: {
          status: 'active',
          OR: [
            // Sessions without orders that have expired
            {
              expiresAt: { lte: now },
              orders: { none: {} },
            },
            // Sessions with orders but idle for > 4 hours
            {
              lastActivityAt: { lte: fourHoursAgo },
              orders: { some: {} },
            },
          ],
        },
        include: {
          table: { select: { id: true, tableNumber: true } },
          orders: {
            where: {
              status: {
                notIn: ['completed', 'cancelled', 'rejected', 'abandoned'],
              },
            },
          },
        },
      });

      if (sessionsToAbandon.length === 0) {
        this.logger.debug('No sessions to cleanup');
        return;
      }

      this.logger.log(`Found ${sessionsToAbandon.length} sessions to abandon`);

      // 2. Process each session
      for (const session of sessionsToAbandon) {
        try {
          await this.prisma.$transaction(async (tx) => {
            // Mark session as abandoned
            await tx.tableSession.update({
              where: { id: session.id },
              data: {
                status: 'abandoned',
                endedAt: now,
                durationMinutes: Math.floor(
                  (now.getTime() - session.startedAt.getTime()) / 60000,
                ),
              },
            });

            // Mark any active orders as abandoned
            if (session.orders.length > 0) {
              await tx.order.updateMany({
                where: {
                  tableSessionId: session.id,
                  status: {
                    notIn: ['completed', 'cancelled', 'rejected', 'abandoned'],
                  },
                },
                data: { status: 'abandoned' },
              });
            }

            // Reset table status to available
            await tx.table.update({
              where: { id: session.tableId },
              data: { status: 'available' },
            });
          });

          this.logger.log(
            `Session ${session.id} for table ${session.table.tableNumber} marked as abandoned`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to abandon session ${session.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Session cleanup completed. Abandoned ${sessionsToAbandon.length} sessions`,
      );
    } catch (error) {
      this.logger.error(`Session cleanup job failed: ${error.message}`);
    }
  }

  /**
   * Cleanup expired idempotency keys every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleIdempotencyKeyCleanup() {
    this.logger.debug('Starting idempotency key cleanup...');

    try {
      const result = await this.prisma.idempotencyKey.deleteMany({
        where: {
          expiresAt: { lte: new Date() },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Deleted ${result.count} expired idempotency keys`);
      }
    } catch (error) {
      this.logger.error(`Idempotency key cleanup failed: ${error.message}`);
    }
  }
}
