import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, tap } from 'rxjs';
import { PrismaService } from '../../prisma.service';
import { IDEMPOTENT_KEY } from '../decorators/idempotent.decorator';

/**
 * Interceptor to handle idempotency for POST requests
 *
 * How it works:
 * 1. Check for Idempotency-Key header
 * 2. If key exists in DB and not expired, return cached response
 * 3. If key is new, process request and cache the response
 * 4. Keys are cleaned up after TTL expires
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Check if endpoint is marked as idempotent
    const idempotentConfig = this.reflector.get<{ ttlMinutes: number }>(
      IDEMPOTENT_KEY,
      context.getHandler(),
    );

    if (!idempotentConfig) {
      return next.handle();
    }

    // Get idempotency key from header
    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey) {
      // No idempotency key provided - process normally
      return next.handle();
    }

    const endpoint = request.url;
    const method = request.method;

    try {
      // Check if key already exists
      const existingKey = await this.prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
      });

      if (existingKey) {
        // Check if expired
        if (new Date() > existingKey.expiresAt) {
          // Key expired, delete it and process new request
          await this.prisma.idempotencyKey.delete({
            where: { key: idempotencyKey },
          });
          this.logger.debug(
            `Expired idempotency key deleted: ${idempotencyKey}`,
          );
        } else {
          // Return cached response
          this.logger.log(
            `Returning cached response for idempotency key: ${idempotencyKey}`,
          );
          response.status(existingKey.statusCode || 200);
          return of(existingKey.response);
        }
      }

      // Process request and cache response
      return next.handle().pipe(
        tap(async (responseData) => {
          try {
            const expiresAt = new Date(
              Date.now() + idempotentConfig.ttlMinutes * 60 * 1000,
            );

            await this.prisma.idempotencyKey.create({
              data: {
                key: idempotencyKey,
                endpoint,
                method,
                response: responseData as any,
                statusCode: response.statusCode,
                expiresAt,
              },
            });

            this.logger.debug(
              `Cached response for idempotency key: ${idempotencyKey}`,
            );
          } catch (error) {
            // Duplicate key (race condition) - ignore
            if (error.code === 'P2002') {
              this.logger.warn(
                `Duplicate idempotency key ignored: ${idempotencyKey}`,
              );
            } else {
              this.logger.error(
                `Failed to cache idempotency key: ${error.message}`,
              );
            }
          }
        }),
      );
    } catch (error) {
      this.logger.error(`Idempotency check failed: ${error.message}`);
      // On error, process request normally
      return next.handle();
    }
  }
}
