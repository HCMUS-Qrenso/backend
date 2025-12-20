import { Module } from '@nestjs/common';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { PrismaService } from '../../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [TablesController],
  providers: [TablesService, PrismaService],
  exports: [TablesService],
  imports: [AuthModule],
})
export class TablesModule {}
