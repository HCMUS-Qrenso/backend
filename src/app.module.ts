import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
