import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * PrismaService - Prisma 7 compatible service
 *
 * Key Prisma 7 changes:
 * - No `url` in schema.prisma datasource
 * - Adapter-based connection using PrismaPg
 * - Connection string passed to adapter, not PrismaClient
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Prisma 7: Create adapter with connection string
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });

    // Pass adapter to PrismaClient
    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Optional: Log slow queries in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query' as never, (e: any) => {
        if (e.duration > 1000) {
          this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
        }
      });
    }
  }

  async onModuleInit() {
    this.logger.log('Connecting to database...');
    await this.$connect();
    this.logger.log('Database connected successfully');
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
  }
}
