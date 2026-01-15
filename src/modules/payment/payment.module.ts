import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaService } from '../../prisma.service';
import { EventsModule } from '../events/events.module';
import { AuthModule } from '../auth/auth.module';
import { TablesModule } from '../tables/tables.module';

@Module({
  imports: [ConfigModule, EventsModule, AuthModule, forwardRef(() => TablesModule)],
  controllers: [PaymentController],
  providers: [PaymentService, PrismaService],
  exports: [PaymentService],
})
export class PaymentModule {}
