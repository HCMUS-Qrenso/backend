import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { ReviewsService } from './reviews.service';
import { CreateItemReviewDto } from './dto/create-item-review.dto';
import { CreateOrderReviewDto } from './dto/create-order-review.dto';
import {
  ReviewResponseDto,
  ItemReviewsResponseDto,
} from './dto/review-response.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { RolesGuard } from 'src/common/guards';
import { ROLES } from 'src/common/constants';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('items')
  @Roles(ROLES.CUSTOMER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a review for a menu item from a past order',
    description:
      'Allows logged-in customers to review items they ordered. The order must be completed and the item must be part of that order.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Review created successfully',
    type: ReviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Invalid request - item not in order, already reviewed, or order not completed',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async createItemReview(
    @CurrentUser('id') customerId: string,
    @Body(ValidationPipe) dto: CreateItemReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.createItemReview(customerId, dto);
  }

  @Post('orders')
  @Roles(ROLES.CUSTOMER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a review for an entire order',
    description:
      'Allows logged-in customers to review their overall experience with an order. The order must be completed.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Order review created successfully',
    type: ReviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request - already reviewed or order not completed',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async createOrderReview(
    @CurrentUser('id') customerId: string,
    @Body(ValidationPipe) dto: CreateOrderReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.createOrderReview(customerId, dto);
  }

  @Get('items/:menuItemId')
  @Public()
  @ApiOperation({
    summary: 'Get all reviews for a specific menu item',
    description:
      'Returns paginated reviews for a menu item along with rating statistics.',
  })
  @ApiParam({
    name: 'menuItemId',
    description: 'Menu item UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Number of reviews per page (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns reviews with statistics',
    type: ItemReviewsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Menu item not found',
    type: ErrorResponseDto,
  })
  async getItemReviews(
    @Param('menuItemId') menuItemId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe)
    pageSize: number,
  ): Promise<ItemReviewsResponseDto> {
    return this.reviewsService.getItemReviews(menuItemId, page, pageSize);
  }

  @Get('orders/:orderId')
  @Public()
  @ApiOperation({
    summary: 'Get all reviews for a specific order',
    description:
      'Returns all reviews (both order-level and item reviews) for a given order.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Order UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all reviews for the order',
    type: [ReviewResponseDto],
  })
  async getOrderReviews(
    @Param('orderId') orderId: string,
  ): Promise<ReviewResponseDto[]> {
    return this.reviewsService.getOrderReviews(orderId);
  }

  @Get('my-reviews')
  @Roles(ROLES.CUSTOMER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all reviews created by the current user',
    description: 'Returns paginated reviews created by the logged-in customer.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Number of reviews per page (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns user reviews',
    schema: {
      properties: {
        reviews: {
          type: 'array',
          items: { $ref: '#/components/schemas/ReviewResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        pageSize: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async getMyReviews(
    @CurrentUser('id') customerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe)
    pageSize: number,
  ) {
    return this.reviewsService.getCustomerReviews(customerId, page, pageSize);
  }

  @Get('reviewable-orders')
  @Roles(ROLES.CUSTOMER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get orders that can be reviewed by the current user',
    description:
      'Returns completed orders with information about which items have been reviewed and which items are still reviewable.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns reviewable orders',
    schema: {
      type: 'array',
      items: {
        properties: {
          orderId: { type: 'string' },
          orderNumber: { type: 'string' },
          tableNumber: { type: 'string' },
          completedAt: { type: 'string', format: 'date-time' },
          totalAmount: { type: 'number' },
          hasOrderReview: { type: 'boolean' },
          reviewableItems: {
            type: 'array',
            items: {
              properties: {
                menuItemId: { type: 'string' },
                name: { type: 'string' },
                imageUrl: { type: 'string', nullable: true },
                quantity: { type: 'number' },
              },
            },
          },
          totalItems: { type: 'number' },
          reviewedItems: { type: 'number' },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async getReviewableOrders(@CurrentUser('id') customerId: string) {
    return this.reviewsService.getCustomerReviewableOrders(customerId);
  }
}
