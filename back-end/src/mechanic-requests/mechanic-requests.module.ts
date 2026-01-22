import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MechanicRequestsController } from './mechanic-requests.controller';
import { MechanicRequestsService } from './mechanic-requests.service';
import { MechanicRequest, MechanicRequestSchema } from './schemas/mechanic-request.schema';
import { Mechanic, MechanicSchema } from '../mechanics/schemas/mechanic.schema';
import { ChatGatewayModule } from '../chat-gateway/chat-gateway.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MechanicRequest.name, schema: MechanicRequestSchema },
      { name: Mechanic.name, schema: MechanicSchema },
    ]),
    ChatGatewayModule,
  ],
  controllers: [MechanicRequestsController],
  providers: [MechanicRequestsService],
  exports: [MechanicRequestsService],
})
export class MechanicRequestsModule {}
