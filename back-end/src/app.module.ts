import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { MechanicsModule } from './mechanics/mechanics.module';
import { RagDocumentsModule } from './rag-documents/rag-documents.module';
import { VectorsModule } from './vectors/vectors.module';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';
import { ActivityModule } from './activity/activity.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { HealthModule } from './health/health.module';
import { MechanicRequestsModule } from './mechanic-requests/mechanic-requests.module';
import { ChatGatewayModule } from './chat-gateway/chat-gateway.module';

@Module({
  imports: [
    // Configuration Module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // MongoDB Atlas Connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    
    // Feature Modules
    AuthModule,
    UsersModule,
    MechanicsModule,
    RagDocumentsModule,
    VectorsModule,
    ChatModule,
    ActivityModule,
    AppointmentsModule,
    HealthModule,
    MechanicRequestsModule,
    ChatGatewayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
