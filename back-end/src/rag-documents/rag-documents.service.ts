import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RagDocument, RagDocumentDocument } from './schemas/rag-document.schema';
import { CreateRagDocumentDto, UpdateRagDocumentDto } from './dto/rag-document.dto';
import { DocumentProcessorService } from '../ai/document-processor.service';
import { VectorsService } from '../vectors/vectors.service';
import { ActivityService } from '../activity/activity.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RagDocumentsService {
  constructor(
    @InjectModel(RagDocument.name) private ragDocumentModel: Model<RagDocumentDocument>,
    private documentProcessor: DocumentProcessorService,
    private vectorsService: VectorsService,
    private activityService: ActivityService,
  ) {}

  async create(
    createRagDocumentDto: CreateRagDocumentDto,
    file: Express.Multer.File,
  ): Promise<RagDocument> {
    const documentData = {
      ...createRagDocumentDto,
      filePath: file.path,
      fileSize: file.size,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      status: 'pending',
    };

    const createdDocument = new this.ragDocumentModel(documentData);
    return createdDocument.save();
  }

  async findAll(category?: string, status?: string): Promise<RagDocument[]> {
    const filter: any = { isActive: true };
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    return this.ragDocumentModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<RagDocument> {
    const document = await this.ragDocumentModel.findById(id).exec();
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }

  async update(id: string, updateRagDocumentDto: UpdateRagDocumentDto): Promise<RagDocument> {
    const updatedDocument = await this.ragDocumentModel
      .findByIdAndUpdate(id, updateRagDocumentDto, { new: true })
      .exec();
    if (!updatedDocument) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return updatedDocument;
  }

  async updateStatus(id: string, status: string): Promise<RagDocument> {
    const updateData: any = { status };
    if (status === 'processed') {
      updateData.processedAt = new Date();
    }
    return this.update(id, updateData);
  }

  async updateChunks(id: string, chunks: number): Promise<RagDocument> {
    return this.update(id, { chunks });
  }

  async remove(id: string): Promise<void> {
    const document = await this.findOne(id);
    
    // Delete vector chunks
    await this.vectorsService.deleteByDocumentId(id);
    
    // Delete the physical file
    if (document.filePath && fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    const result = await this.ragDocumentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
  }

  async vectorizeDocument(id: string): Promise<RagDocument> {
    const document = await this.findOne(id);

    try {
      // Update status to processing
      await this.updateStatus(id, 'processing');

      // Process document into chunks
      const chunks = await this.documentProcessor.processDocument(
        document.filePath,
        document.mimeType,
      );

      // Store chunks with embeddings
      for (const chunk of chunks) {
        await this.vectorsService.storeChunk(
          chunk.content,
          id,
          chunk.chunkIndex,
          {
            ...chunk.metadata,
            title: document.title,
            category: document.category,
          },
        );
      }

      // Update document status and chunk count
      await this.update(id, { 
        status: 'processed',
        chunks: chunks.length,
      });

      // Log activity
      await this.activityService.log(
        'rag',
        'Document vectorized successfully',
        undefined,
        'System',
        { documentId: id, title: document.title, chunks: chunks.length },
      );

      return this.findOne(id);
    } catch (error) {
      // Update status to failed
      await this.updateStatus(id, 'failed');
      throw error;
    }
  }

  async getStats() {
    const total = await this.ragDocumentModel
      .countDocuments({ isActive: true })
      .exec();
    const processed = await this.ragDocumentModel
      .countDocuments({ status: 'processed', isActive: true })
      .exec();
    const pending = await this.ragDocumentModel
      .countDocuments({ status: 'pending', isActive: true })
      .exec();
    const processing = await this.ragDocumentModel
      .countDocuments({ status: 'processing', isActive: true })
      .exec();

    const totalChunksResult = await this.ragDocumentModel.aggregate([
      { $match: { isActive: true, status: 'processed' } },
      { $group: { _id: null, totalChunks: { $sum: '$chunks' } } },
    ]);
    const totalChunks = totalChunksResult[0]?.totalChunks || 0;

    const totalSizeResult = await this.ragDocumentModel.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalSize: { $sum: '$fileSize' } } },
    ]);
    const totalSize = totalSizeResult[0]?.totalSize || 0;

    return {
      total,
      processed,
      pending,
      processing,
      totalChunks,
      totalSize: Math.round(totalSize / 1024 / 1024 * 100) / 100, // MB
    };
  }

  async getByCategory() {
    const categories = await this.ragDocumentModel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return categories.map((cat) => ({
      category: cat._id,
      count: cat.count,
      totalSize: Math.round(cat.totalSize / 1024 / 1024 * 100) / 100,
    }));
  }
}
