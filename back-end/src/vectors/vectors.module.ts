import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VectorsService } from './vectors.service';
import { VectorChunk, VectorChunkSchema } from './schemas/vector-chunk.schema';
import { GeminiService } from '../ai/gemini.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: VectorChunk.name, schema: VectorChunkSchema }]),
  ],
  providers: [VectorsService, GeminiService],
  exports: [VectorsService],
})
export class VectorsModule {}
