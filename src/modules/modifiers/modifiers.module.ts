import { Module } from '@nestjs/common';
import { ModifiersController } from './modifiers.controller';
import { ModifiersService } from './modifiers.service';
import { PrismaService } from '../../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ModifiersController],
  providers: [ModifiersService, PrismaService],
  exports: [ModifiersService],
})
export class ModifiersModule {}
