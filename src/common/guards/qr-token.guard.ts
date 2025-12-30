import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
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
}

/**
 * Guard to verify QR token or Session token from Authorization header.
 * Staff roles can bypass this check.
 * Guests/Customers must provide valid QR token or session token.
 */
@Injectable()
export class QrTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: JwtPayload;
      headers: Record<string, string>;
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

    // Take token from Bearer authorization header or x-qr-token
    const authHeader = request.headers['authorization'];
    const qrToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : request.headers['x-qr-token'];

    if (!qrToken) {
      throw new ForbiddenException(
        t(
          'auth.qrScanRequired',
          'Please scan the QR code on your table to access this feature',
        ),
      );
    }

    try {
      // Verify token signature
      const decoded = this.jwtService.verify<QrTokenPayload>(qrToken);

      // Check if it's a session token (from POST /tables/session/start)
      if (decoded.type === 'session') {
        // Find active session
        const session = await this.prisma.tableSession.findFirst({
          where: {
            sessionToken: qrToken,
            status: 'active',
          },
          include: {
            table: {
              include: {
                tenant: { select: { name: true } },
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

        // Attach session context to request
        request.qrContext = {
          tableId: session.tableId,
          tableNumber: session.table.tableNumber,
          tenantId: session.table.tenantId,
          tableCapacity: session.table.capacity,
          tenantName: session.table.tenant.name,
          tenantImage: '',
          zoneName: session.table.zone?.name || '',
          tableSessionId: session.id,
          customerId: session.customerId || undefined,
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
      request.qrContext = {
        tableId: table.id,
        tableNumber: table.tableNumber,
        tenantId: table.tenantId,
        tableCapacity: table.capacity,
        tenantName: table.tenant.name,
        tenantImage: decoded.tenantImage || '',
        zoneName: table.zone?.name || '',
        tableSessionId: activeSession?.id,
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

