import { ApiProperty } from '@nestjs/swagger';

export class ReviewerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;
}

export class MenuItemBasicDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  imageUrl?: string;
}

export class ReviewResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false })
  menuItemId?: string;

  @ApiProperty({ required: false })
  menuItem?: MenuItemBasicDto;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  customer: ReviewerDto;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  rating: number;

  @ApiProperty({ required: false })
  comment?: string;

  @ApiProperty()
  isVerifiedPurchase: boolean;

  @ApiProperty()
  status: string;

  @ApiProperty()
  reviewType: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ReviewStatsDto {
  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  totalReviews: number;

  @ApiProperty()
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export class ItemReviewsResponseDto {
  @ApiProperty({ type: [ReviewResponseDto] })
  reviews: ReviewResponseDto[];

  @ApiProperty()
  stats: ReviewStatsDto;

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}
