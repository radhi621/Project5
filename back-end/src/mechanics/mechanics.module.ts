import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MechanicsController } from './mechanics.controller';
import { MechanicsService } from './mechanics.service';
import { Mechanic, MechanicSchema } from './schemas/mechanic.schema';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Mechanic.name, schema: MechanicSchema }]),
    ActivityModule,
  ],
  controllers: [MechanicsController],
  providers: [MechanicsService],
  exports: [MechanicsService],
})
export class MechanicsModule {}
