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
}

/**
 * Guard to verify QR token from x-qr-token header.
 * Staff roles can bypass this check.
 * Guests/Customers must provide valid QR token.
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

    // Take QR token from Bearer if user is GUEST, from x-qr-token header otherwise
    const qrToken =
      user?.role === ROLES.GUEST
        ? request.headers['authorization']?.split(' ')[1]
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
      // Verify QR token signature
      const decoded = this.jwtService.verify<QrTokenPayload>(qrToken);

      // Ensure it's a valid GUEST token with table context
      if (decoded.role !== ROLES.GUEST || !decoded.tableId) {
        throw new UnauthorizedException(
          t('auth.invalidQrToken', 'Invalid QR token'),
        );
      }

      // Verify table exists and is active
      const table = await this.prisma.table.findUnique({
        where: { id: decoded.tableId, tenantId: decoded.tenantId },
      });

      if (!table) {
        throw new ForbiddenException(
          t('tables.tableNotFound', 'Table not found'),
        );
      }

      if (!table.isActive) {
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

      // Attach table context to request for controllers to use
      request.qrContext = {
        tableId: table.id,
        tableNumber: table.tableNumber,
        tenantId: table.tenantId,
        tableCapacity: table.capacity,
        tenantName: decoded.tenantName,
        tenantImage: decoded.tenantImage,
        zoneName: decoded.zoneName,
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
