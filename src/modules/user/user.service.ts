import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { t } from '../../common/utils';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        tenantId: true,
        emailVerified: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    return user;
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users;
  }

  async updateUserProfile(userId: string, updateData: UpdateProfileDto) {
    try {
      // Mark the avatar with time-based query param to force refresh
      if (updateData.avatarUrl) {
        const separator = updateData.avatarUrl.includes('?') ? '&' : '?';
        updateData.avatarUrl = `${updateData.avatarUrl}${separator}t=${Date.now()}`;
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
          updatedAt: true,
        },
      });

      return {
        message: t(
          'user.profileUpdatedSuccess',
          'Profile updated successfully',
        ),
        user: user,
      };
    } catch {
      throw new Error(
        t('user.profileUpdateFailed', 'Failed to update profile'),
      );
    }
  }
}
