import { Module, forwardRef } from '@nestjs/common';
import { KdsController } from './kds.controller';
import { KdsService } from './kds.service';
import { PrismaService } from '../../prisma.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [forwardRef(() => OrdersModule)],
  controllers: [KdsController],
  providers: [KdsService, PrismaService],
  exports: [KdsService],
})
export class KdsModule {}
