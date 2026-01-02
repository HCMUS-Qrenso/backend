import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';
import { ROLES } from '../constants';
import { t } from '../utils';
import { JwtPayload } from '../interfaces';

/**
 * QR Token Payload (extends JwtPayload)
 */
interface QrTokenPayload extends JwtPayload {
  tableId: string;
  tableNumber: string;
  tableCapacity: number;
  tenantName: string;
  tenantImage: string;
  zoneName: string;
  type?: 'qr' | 'session'; // Token type
  deviceId?: string; // For session tokens
  sessionId?: string; // For session tokens
}

/**
 * Guard to verify QR token or Session token.
 *
 * Token Priority (v2.0 - no backward compatibility):
 * 1. x-table-session-token header (for order operations) - REQUIRED
 * 2. x-qr-token header (for menu/session start)
 *
 * Note: Authorization Bearer header is ONLY for access tokens (identity).
 * Session/QR tokens MUST be sent via x-table-session-token or x-qr-token headers.
 *
 * Staff roles can bypass this check.
 * Guests/Customers must provide valid QR token or session token.
 */
@Injectable()
export class QrTokenGuard implements CanActivate {
  private readonly logger = new Logger(QrTokenGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: JwtPayload & { id?: string }; // JWT strategy returns user from database with 'id' field
      headers: Record<string, string>;
      url?: string;
      method?: string;
      qrContext?: {
        tableId: string;
        tableNumber: string;
        tenantId: string;
        tableCapacity: number;
        tenantName: string;
        tenantImage: string;
        zoneName: string;
        tableSessionId?: string;
        customerId?: string;
        deviceId?: string; // For multi-device tracking
      };
    }>();

    const user = request.user;

    // Staff roles can access without QR token
    const staffRoles = [
      ROLES.SUPER_ADMIN,
      ROLES.OWNER,
      ROLES.ADMIN,
      ROLES.WAITER,
      ROLES.KITCHEN,
    ];

    if (user?.role && (staffRoles as string[]).includes(user.role)) {
      return true;
    }

    // TOKEN PRIORITY ORDER (v2.0 - no backward compatibility):
    // 1. x-table-session-token: Required for order operations (both guest & authenticated)
    // 2. x-qr-token: For menu viewing and session start
    //
    // Authorization Bearer header is ONLY for access tokens (identity).
    // Session/QR tokens MUST be sent via dedicated headers.

    const tableSessionToken = request.headers['x-table-session-token'] as
      | string
      | undefined;
    const qrTokenFromHeader = request.headers['x-qr-token'] as
      | string
      | undefined;

    // Priority: session token > qr token
    const qrToken = tableSessionToken || qrTokenFromHeader;

    // Log token source for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      const tokenSource = tableSessionToken
        ? 'x-table-session-token'
        : qrTokenFromHeader
          ? 'x-qr-token'
          : 'none';
      this.logger.debug(`Token source: ${tokenSource}`);
    }

    if (!qrToken) {
      // Provide helpful error message with guidance
      const isOrderOperation =
        request.url?.includes('/orders') &&
        request.method !== 'GET' &&
        !request.url?.includes('/my-order') &&
        !request.url?.includes('/current');

      if (isOrderOperation) {
        throw new ForbiddenException(
          t(
            'auth.sessionTokenRequired',
            'Session token required. Please provide x-table-session-token header. Start a session first by calling POST /tables/session/start',
          ),
        );
      }

      throw new ForbiddenException(
        t(
          'auth.qrScanRequired',
          'Please scan the QR code on your table to access this feature. Provide x-qr-token or x-table-session-token header.',
        ),
      );
    }

    try {
      // Verify token signature
      const decoded = this.jwtService.verify<QrTokenPayload>(qrToken);

      // Check if it's a session token (from POST /tables/session/start)
      if (decoded.type === 'session') {
        // Find active session - check both by sessionToken and by sessionId in JWT
        const session = await this.prisma.tableSession.findFirst({
          where: {
            OR: [
              { sessionToken: qrToken },
              // Also check by sessionId for rotated tokens
              ...(decoded.sessionId ? [{ id: decoded.sessionId }] : []),
            ],
            status: 'active',
          },
          include: {
            table: {
              include: {
                tenant: { select: { name: true, image: true } },
                zone: { select: { name: true } },
              },
            },
          },
        });

        if (!session) {
          throw new UnauthorizedException(
            t('auth.sessionNotFound', 'Session not found or expired'),
          );
        }

        // Check session expiration
        if (session.expiresAt && new Date() > session.expiresAt) {
          throw new UnauthorizedException(
            t(
              'auth.sessionExpired',
              'Session has expired. Please scan the QR code again.',
            ),
          );
        }

        // Attach session context to request
        // Priority for customerId: session.customerId > request.user.id (for authenticated users)
        // JWT strategy returns user from database with 'id' field, not 'sub'
        // Priority for deviceId: decoded.deviceId (from session token)
        request.qrContext = {
          tableId: session.tableId,
          tableNumber: session.table.tableNumber,
          tenantId: session.table.tenantId,
          tableCapacity: session.table.capacity,
          tenantName: session.table.tenant.name,
          tenantImage: session.table.tenant.image || '',
          zoneName: session.table.zone?.name || '',
          tableSessionId: session.id,
          customerId:
            session.customerId ||
            (user?.id as string) ||
            (user?.sub as string) ||
            undefined,
          deviceId: decoded.deviceId,
        };

        return true;
      }

      // Original QR token handling
      if (decoded.role !== ROLES.GUEST || !decoded.tableId) {
        throw new UnauthorizedException(
          t('auth.invalidQrToken', 'Invalid QR token'),
        );
      }

      // Verify table exists and is active
      const table = await this.prisma.table.findUnique({
        where: { id: decoded.tableId, tenantId: decoded.tenantId },
        include: {
          tenant: { select: { name: true } },
          zone: { select: { name: true } },
        },
      });

      if (!table) {
        throw new ForbiddenException(
          t('tables.tableNotFound', 'Table not found'),
        );
      }

      if (!table.isActive || table.status === 'maintenance') {
        throw new ForbiddenException(
          t(
            'auth.tableInactive',
            'This table is currently unavailable. Please ask staff for assistance.',
          ),
        );
      }

      // Verify token matches current table QR token (not regenerated)
      if (table.qrCodeToken !== qrToken) {
        throw new ForbiddenException(
          t(
            'auth.qrTokenOutdated',
            'This QR code is outdated. Please scan the current QR code on the table.',
          ),
        );
      }

      // Check for active session for this table
      const activeSession = await this.prisma.tableSession.findFirst({
        where: {
          tableId: table.id,
          status: 'active',
        },
      });

      // Attach table context to request for controllers to use
      // Include customerId if user is authenticated
      request.qrContext = {
        tableId: table.id,
        tableNumber: table.tableNumber,
        tenantId: table.tenantId,
        tableCapacity: table.capacity,
        tenantName: table.tenant.name,
        tenantImage: decoded.tenantImage || '',
        zoneName: table.zone?.name || '',
        tableSessionId: activeSession?.id,
        customerId:
          (user?.sub as string) || activeSession?.customerId || undefined,
      };

      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // JWT verification errors
      const errorMessage =
        (error as Error).name === 'JsonWebTokenError'
          ? t('auth.invalidQrToken', 'Invalid QR token signature')
          : (error as Error).name === 'TokenExpiredError'
            ? t('auth.qrTokenExpired', 'QR token expired')
            : t(
                'auth.qrTokenVerificationFailed',
                'QR token verification failed',
              );

      throw new UnauthorizedException(errorMessage);
    }
  }
}
