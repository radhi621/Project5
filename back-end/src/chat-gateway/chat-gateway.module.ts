import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './chat.gateway';
import {
  MechanicRequest,
  MechanicRequestSchema,
} from '../mechanic-requests/schemas/mechanic-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MechanicRequest.name, schema: MechanicRequestSchema },
    ]),
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatGatewayModule {}
