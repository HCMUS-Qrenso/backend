import { Module } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { VouchersController, CustomerVouchersController } from './vouchers.controller';
import { PrismaService } from '../../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [VouchersController, CustomerVouchersController],
  providers: [VouchersService, PrismaService],
  exports: [VouchersService],
})
export class VouchersModule {}
