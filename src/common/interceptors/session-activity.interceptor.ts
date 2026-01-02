import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma.service';

/**
 * Interceptor to update session lastActivityAt timestamp on each request
 * Works with requests that have a valid session context (qrContext.tableSessionId)
 */
@Injectable()
export class SessionActivityInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const qrContext = request.qrContext;

    // Only update activity if we have a session ID
    if (!qrContext?.tableSessionId) {
      return next.handle();
    }

    const sessionId = qrContext.tableSessionId;

    // Update activity after the request completes successfully
    return next.handle().pipe(
      tap(async () => {
        try {
          await this.prisma.tableSession.update({
            where: { id: sessionId },
            data: { lastActivityAt: new Date() },
          });
        } catch (error) {
          // Log but don't fail the request if activity update fails
          console.warn(
            `Failed to update session activity for ${sessionId}:`,
            error.message,
          );
        }
      }),
    );
  }
}
