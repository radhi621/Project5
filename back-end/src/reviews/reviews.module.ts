import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { Review, ReviewSchema } from './schemas/review.schema';
import { MechanicRequest, MechanicRequestSchema } from '../mechanic-requests/schemas/mechanic-request.schema';
import { Mechanic, MechanicSchema } from '../mechanics/schemas/mechanic.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: MechanicRequest.name, schema: MechanicRequestSchema },
      { name: Mechanic.name, schema: MechanicSchema },
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
