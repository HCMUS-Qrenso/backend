import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { TablesModule } from '../tables/tables.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [
    AuthModule,
    EventsModule,
    forwardRef(() => TablesModule),
    VouchersModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService],
  exports: [OrdersService],
})
export class OrdersModule {}
