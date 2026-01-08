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

    // Mark the avatar with a new Date to prevent caching issues
    if (user && user.avatarUrl) {
      const separator = user.avatarUrl.includes('?') ? '&' : '?';
      user.avatarUrl = `${user.avatarUrl}${separator}t=${Date.now()}`;
    }

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

      // Mark the avatar with a new Date to prevent caching issues
      if (user && user.avatarUrl) {
        const separator = user.avatarUrl.includes('?') ? '&' : '?';
        user.avatarUrl = `${user.avatarUrl}${separator}t=${Date.now()}`;
      }

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
