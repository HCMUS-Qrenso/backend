import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import {
  I18nModule,
  AcceptLanguageResolver,
  I18nMiddleware,
} from 'nestjs-i18n';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { TablesModule } from './modules/tables/tables.module';
import { ZonesModule } from './modules/zones/zones.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { MenuModule } from './modules/menu/menu.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ModifiersModule } from './modules/modifiers/modifiers.module';
import { UploadModule } from './modules/uploads/upload.module';
import { JwtAuthGuard } from './modules/auth/guards';
import { StaffModule } from './modules/staff/staff.module';
import { OrdersModule } from './modules/orders/orders.module';
import { EventsModule } from './modules/events/events.module';
import { KdsModule } from './modules/kds/kds.module';
import { PaymentModule } from './modules/payment/payment.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, 'i18n'),
        watch: true,
      },
      resolvers: [new AcceptLanguageResolver()],
    }),
    AuthModule,
    UserModule,
    TablesModule,
    ZonesModule,
    TenantModule,
    MenuModule,
    CategoriesModule,
    ModifiersModule,
    UploadModule,
    StaffModule,
    OrdersModule,
    EventsModule,
    KdsModule,
    PaymentModule,
    DashboardModule,
    ReviewsModule,
    VouchersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(I18nMiddleware).forRoutes('*');
  }
}
