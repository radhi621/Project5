import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { RagDocumentsController } from './rag-documents.controller';
import { RagDocumentsService } from './rag-documents.service';
import { RagDocument, RagDocumentSchema } from './schemas/rag-document.schema';
import { VectorsModule } from '../vectors/vectors.module';
import { DocumentProcessorService } from '../ai/document-processor.service';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RagDocument.name, schema: RagDocumentSchema }]),
    MulterModule.register({
      dest: './uploads/rag-documents',
    }),
    VectorsModule,
    ActivityModule,
  ],
  controllers: [RagDocumentsController],
  providers: [RagDocumentsService, DocumentProcessorService],
  exports: [RagDocumentsService],
})
export class RagDocumentsModule {}
