import { Module } from '@nestjs/common';
import { ModifiersController } from './modifiers.controller';
import { ModifiersService } from './modifiers.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [ModifiersController],
  providers: [ModifiersService, PrismaService],
  exports: [ModifiersService],
})
export class ModifiersModule {}
