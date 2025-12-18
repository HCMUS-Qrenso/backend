import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable cookie parser
  app.use(cookieParser());

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Enable global exception filter for standardized error responses
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    // Setup Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('Backend API')
      .setDescription(
        'API documentation for the backend application\n\n' +
          '## 🌐 Localization\n\n' +
          'This API supports multiple languages through the `Accept-Language` header.\n\n' +
          '**Supported Languages:**\n' +
          '- `en` (English) - Default\n' +
          '- `vi` (Vietnamese)\n\n' +
          '**Usage:**\n' +
          'Include the `Accept-Language` header in your requests to receive localized responses.\n\n' +
          '**Example:**\n' +
          '```\n' +
          'Accept-Language: vi\n' +
          '```\n\n' +
          'All error messages, success messages, and validation messages will be returned in the specified language.',
      )
      .setVersion('1.0')
      .addTag('auth', 'Authentication endpoints')
      .addTag('tenants', 'Tenant management endpoints for owners')
      .addTag('users', 'User management endpoints')
      .addTag('tables', 'Table management endpoints')
      .addTag('zones', 'Zone management endpoints')
      .addTag('menu', 'Menu management endpoints')
      .addTag('categories', 'Category management endpoints')
      .addTag('modifiers', 'Modifier management endpoints')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addCookieAuth('refreshToken', {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
      })
      .addGlobalParameters(
        {
          in: 'header',
          required: false,
          name: 'Accept-Language',
          description: 'Language preference for response messages (en, vi)',
          schema: {
            type: 'string',
            enum: ['en', 'vi'],
            default: 'en',
          },
        },
        {
          in: 'header',
          required: false,
          name: 'x-tenant-id',
          description:
            'Tenant ID that the owner wants to operate on - If not owner, ignore this header',
          schema: {
            type: 'string',
          },
        },
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/docs`);
}
bootstrap();
