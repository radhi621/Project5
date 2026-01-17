import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MechanicRequestsController } from './mechanic-requests.controller';
import { MechanicRequestsService } from './mechanic-requests.service';
import { MechanicRequest, MechanicRequestSchema } from './schemas/mechanic-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MechanicRequest.name, schema: MechanicRequestSchema },
    ]),
  ],
  controllers: [MechanicRequestsController],
  providers: [MechanicRequestsService],
  exports: [MechanicRequestsService],
})
export class MechanicRequestsModule {}
