import { Module } from '@nestjs/common';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { SessionCleanupJob } from './session-cleanup.job';
import { PrismaService } from '../../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [TablesController],
  providers: [TablesService, SessionCleanupJob, PrismaService],
  exports: [TablesService],
  imports: [AuthModule],
})
export class TablesModule {}
