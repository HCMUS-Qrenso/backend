import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { TokenGenerator } from '../../../common/utils';
import { TOKEN_CONFIG } from '../../../common/constants';

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  async createRefreshToken(userId: string): Promise<string> {
    const token = TokenGenerator.generate(64);
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS,
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  async validateRefreshToken(token: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!storedToken) {
      return null;
    }

    if (storedToken.expiresAt < new Date()) {
      await this.deleteRefreshToken(token);
      return null;
    }

    return storedToken.user;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token },
    });
  }

  async deleteUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async createVerificationToken(
    userId: string,
    type: 'email_verification' | 'password_reset',
  ): Promise<string> {
    const token = TokenGenerator.generate();
    const expiresAt = new Date();

    if (type === 'email_verification') {
      expiresAt.setHours(
        expiresAt.getHours() + TOKEN_CONFIG.VERIFICATION_TOKEN_EXPIRY_HOURS,
      );
    } else {
      expiresAt.setHours(
        expiresAt.getHours() + TOKEN_CONFIG.PASSWORD_RESET_TOKEN_EXPIRY_HOURS,
      );
    }

    // Invalidate existing tokens of the same type
    await this.prisma.userVerificationToken.updateMany({
      where: {
        userId,
        type,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    await this.prisma.userVerificationToken.create({
      data: {
        userId,
        token,
        type,
        expiresAt,
      },
    });

    return token;
  }

  async validateVerificationToken(
    token: string,
    type: 'email_verification' | 'password_reset',
  ) {
    const verificationToken = await this.prisma.userVerificationToken.findFirst(
      {
        where: {
          token,
          type,
        },
        include: { user: true },
      },
    );

    if (!verificationToken) {
      return { valid: false, error: 'Invalid token', user: null };
    }

    if (verificationToken.expiresAt < new Date()) {
      return { valid: false, error: 'Token has expired', user: null };
    }

    if (verificationToken.usedAt) {
      return { valid: false, error: 'Token has already been used', user: null };
    }

    return {
      valid: true,
      error: null,
      user: verificationToken.user,
      tokenId: verificationToken.id,
    };
  }

  async markTokenAsUsed(tokenId: string): Promise<void> {
    await this.prisma.userVerificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }
}
