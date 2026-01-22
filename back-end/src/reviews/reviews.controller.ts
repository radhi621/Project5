import { Controller, Get, Post, Body, Param, Query, UseGuards, Request as Req } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, GetReviewsQueryDto } from './dto/review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles('user', 'admin')
  create(@Req() req: any, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(req.user.userId, createReviewDto);
  }

  @Get('mechanic/:mechanicId')
  findByMechanic(
    @Param('mechanicId') mechanicId: string,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.findByMechanic(mechanicId, limit);
  }

  @Get('mechanic/:mechanicId/stats')
  getMechanicStats(@Param('mechanicId') mechanicId: string) {
    return this.reviewsService.getMechanicStats(mechanicId);
  }

  @Get('user/:userId')
  @Roles('user', 'admin')
  findByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.findByUser(userId, limit);
  }

  @Get('my-reviews')
  @Roles('user', 'admin')
  findMyReviews(@Req() req: any, @Query('limit') limit?: number) {
    return this.reviewsService.findByUser(req.user.userId, limit);
  }

  @Get('request/:requestId')
  findByRequest(@Param('requestId') requestId: string) {
    return this.reviewsService.findByRequest(requestId);
  }

  @Get()
  @Roles('admin')
  findAll(@Query('limit') limit?: number) {
    return this.reviewsService.getAll(limit);
  }
}
