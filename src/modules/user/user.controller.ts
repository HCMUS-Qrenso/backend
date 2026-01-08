import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserService } from './user.service';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ROLES } from 'src/common/constants';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile with full details' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns user profile information',
    schema: {
      properties: {
        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        email: { type: 'string', example: 'user@example.com' },
        fullName: { type: 'string', example: 'John Doe' },
        phone: { type: 'string', nullable: true, example: '+84901234567' },
        role: { type: 'string', example: 'customer' },
        emailVerified: { type: 'boolean', example: true },
        status: { type: 'string', example: 'active' },
        avatarUrl: { type: 'string', nullable: true, example: null },
        tenantId: { type: 'string', nullable: true, example: null },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2025-12-13T10:30:00.000Z',
        },
        lastLoginAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          example: '2025-12-13T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async getProfile(@CurrentUser() user: any) {
    return this.userService.getUserProfile(user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({
    type: UpdateProfileDto,
    description: 'Profile update data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
    schema: {
      properties: {
        message: {
          type: 'string',
          example: 'Profile updated successfully',
        },
        user: {
          properties: {
            id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            email: { type: 'string', example: 'user@example.com' },
            fullName: { type: 'string', example: 'John Doe' },
            phone: { type: 'string', nullable: true, example: '+84901234567' },
            avatarUrl: { type: 'string', nullable: true, example: null },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-13T12:30:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async updateProfile(
    @CurrentUser() user: any,
    @Body(ValidationPipe) updateData: UpdateProfileDto,
  ) {
    return await this.userService.updateUserProfile(user.id, updateData);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all users (Super Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of all users',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: {
            type: 'string',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
          email: { type: 'string', example: 'user@example.com' },
          fullName: { type: 'string', example: 'John Doe' },
          role: { type: 'string', example: 'customer' },
          status: { type: 'string', example: 'active' },
          emailVerified: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions (requires admin or manager role)',
    type: ErrorResponseDto,
  })
  async getAllUsers() {
    return this.userService.getAllUsers();
  }
}
