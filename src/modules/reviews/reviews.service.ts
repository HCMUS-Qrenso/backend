import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { t } from '../../common/utils';
import { CreateItemReviewDto } from './dto/create-item-review.dto';
import { CreateOrderReviewDto } from './dto/create-order-review.dto';
import {
  ReviewResponseDto,
  ItemReviewsResponseDto,
  ReviewStatsDto,
} from './dto/review-response.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a review for a specific item in an order
   */
  async createItemReview(
    customerId: string,
    dto: CreateItemReviewDto,
  ): Promise<ReviewResponseDto> {
    // Verify the order exists and belongs to the customer
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        customerId,
        paymentStatus: 'paid',
      },
      include: {
        items: {
          where: {
            menuItemId: dto.menuItemId,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        t('reviews.orderNotFoundOrNotCompleted', 'Order not found or not completed, or does not belong to you'),
      );
    }

    if (order.items.length === 0) {
      throw new BadRequestException(
        t('reviews.itemNotInOrder', 'This item was not ordered in the specified order'),
      );
    }

    // Check if review already exists
    const existingReview = await this.prisma.review.findUnique({
      where: {
        customerId_orderId_menuItemId: {
          customerId,
          orderId: dto.orderId,
          menuItemId: dto.menuItemId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException(
        t('reviews.alreadyReviewedItem', 'You have already reviewed this item for this order'),
      );
    }

    // Create the review
    const review = await this.prisma.review.create({
      data: {
        customerId,
        orderId: dto.orderId,
        menuItemId: dto.menuItemId,
        rating: dto.rating,
        comment: dto.comment,
        isVerifiedPurchase: true,
        reviewType: 'item',
        status: 'approved',
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        menuItem: {
          select: {
            id: true,
            name: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { imageUrl: true },
            },
          },
        },
      },
    });

    return this.mapReviewToDto(review);
  }

  /**
   * Create a review for an entire order
   */
  async createOrderReview(
    customerId: string,
    dto: CreateOrderReviewDto,
  ): Promise<ReviewResponseDto> {
    // Verify the order exists and belongs to the customer
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        customerId,
        paymentStatus: 'paid',
      },
    });

    if (!order) {
      throw new NotFoundException(
        t('reviews.orderNotFoundOrNotCompleted', 'Order not found or not completed, or does not belong to you'),
      );
    }

    // Check if order review already exists
    const existingReview = await this.prisma.review.findFirst({
      where: {
        customerId,
        orderId: dto.orderId,
        reviewType: 'order',
        menuItemId: null,
      },
    });

    if (existingReview) {
      throw new BadRequestException(
        t('reviews.alreadyReviewedOrder', 'You have already reviewed this order'),
      );
    }

    // Create the order review
    const review = await this.prisma.review.create({
      data: {
        customerId,
        orderId: dto.orderId,
        menuItemId: null,
        rating: dto.rating,
        comment: dto.comment,
        isVerifiedPurchase: true,
        reviewType: 'order',
        status: 'approved',
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return this.mapReviewToDto(review);
  }

  /**
   * Get all reviews for a specific menu item with pagination
   */
  async getItemReviews(
    menuItemId: string,
    page = 1,
    pageSize = 10,
  ): Promise<ItemReviewsResponseDto> {
    const skip = (page - 1) * pageSize;

    // Verify menu item exists
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });

    if (!menuItem) {
      throw new NotFoundException(
        t('reviews.menuItemNotFound', 'Menu item not found'),
      );
    }

    // Get reviews with pagination
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          menuItemId,
          reviewType: 'item',
          status: 'approved',
        },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
          menuItem: {
            select: {
              id: true,
              name: true,
              images: {
                where: { isPrimary: true },
                take: 1,
                select: { imageUrl: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.review.count({
        where: {
          menuItemId,
          reviewType: 'item',
          status: 'approved',
        },
      }),
    ]);

    // Calculate statistics
    const stats = await this.calculateItemStats(menuItemId);

    return {
      reviews: reviews.map((review) => this.mapReviewToDto(review)),
      stats,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get all reviews for a specific order (both order-level and item reviews)
   */
  async getOrderReviews(
    orderId: string,
    customerId?: string,
  ): Promise<ReviewResponseDto[]> {
    const where: any = {
      orderId,
      status: 'approved',
    };

    // If customerId is provided, only return reviews by that customer
    if (customerId) {
      where.customerId = customerId;
    }

    const reviews = await this.prisma.review.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        menuItem: {
          select: {
            id: true,
            name: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { imageUrl: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reviews.map((review) => this.mapReviewToDto(review));
  }

  /**
   * Get all orders that a customer has paid but not yet reviewed
   */
  async getCustomerReviewableOrders(customerId: string) {
    const completedOrders = await this.prisma.order.findMany({
      where: {
        customerId,
        paymentStatus: 'paid',
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                  select: { imageUrl: true },
                },
              },
            },
          },
        },
        reviews: true,
        table: {
          select: {
            tableNumber: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    return completedOrders.map((order) => {
      const orderReview = order.reviews.find((r) => r.reviewType === 'order');
      const itemReviews = order.reviews.filter((r) => r.reviewType === 'item');

      // Determine which items haven't been reviewed yet
      const reviewableItems = order.items.filter(
        (item) =>
          !itemReviews.some((review) => review.menuItemId === item.menuItemId),
      );

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.table.tableNumber,
        completedAt: order.completedAt,
        totalAmount: order.totalAmount,
        hasOrderReview: !!orderReview,
        reviewableItems: reviewableItems.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.menuItem.name,
          imageUrl: item.menuItem.images[0]?.imageUrl,
          quantity: item.quantity,
        })),
        totalItems: order.items.length,
        reviewedItems: itemReviews.length,
      };
    });
  }

  /**
   * Get reviews created by a specific customer
   */
  async getCustomerReviews(
    customerId: string,
    page = 1,
    pageSize = 10,
  ): Promise<{
    reviews: ReviewResponseDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const skip = (page - 1) * pageSize;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          customerId,
          status: 'approved',
        },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
          menuItem: {
            select: {
              id: true,
              name: true,
              images: {
                where: { isPrimary: true },
                take: 1,
                select: { imageUrl: true },
              },
            },
          },
          order: {
            select: {
              orderNumber: true,
              completedAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.review.count({
        where: {
          customerId,
          status: 'approved',
        },
      }),
    ]);

    return {
      reviews: reviews.map((review) => this.mapReviewToDto(review)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Calculate statistics for item reviews
   */
  private async calculateItemStats(
    menuItemId: string,
  ): Promise<ReviewStatsDto> {
    const reviews = await this.prisma.review.findMany({
      where: {
        menuItemId,
        reviewType: 'item',
        status: 'approved',
      },
      select: {
        rating: true,
      },
    });

    const totalReviews = reviews.length;
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    let sumRatings = 0;
    reviews.forEach((review) => {
      sumRatings += review.rating;
      ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
    });

    const averageRating = totalReviews > 0 ? sumRatings / totalReviews : 0;

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingDistribution,
    };
  }

  /**
   * Map review entity to DTO
   */
  private mapReviewToDto(review: any): ReviewResponseDto {
    return {
      id: review.id,
      menuItemId: review.menuItemId,
      menuItem: review.menuItem
        ? {
            id: review.menuItem.id,
            name: review.menuItem.name,
            imageUrl: review.menuItem.images?.[0]?.imageUrl,
          }
        : undefined,
      customerId: review.customerId,
      customer: {
        id: review.customer.id,
        fullName: review.customer.fullName,
        avatarUrl: review.customer.avatarUrl,
      },
      orderId: review.orderId,
      rating: review.rating,
      comment: review.comment,
      isVerifiedPurchase: review.isVerifiedPurchase,
      status: review.status,
      reviewType: review.reviewType,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
