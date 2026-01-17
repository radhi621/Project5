import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Chat, ChatSchema } from './schemas/chat.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { VectorsModule } from '../vectors/vectors.module';
import { GeminiService } from '../ai/gemini.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chat.name, schema: ChatSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    VectorsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, GeminiService],
  exports: [ChatService],
})
export class ChatModule {}
