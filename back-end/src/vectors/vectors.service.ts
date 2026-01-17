import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VectorChunk, VectorChunkDocument } from './schemas/vector-chunk.schema';
import { GeminiService } from '../ai/gemini.service';

export interface SearchResult {
  content: string;
  similarity: number;
  metadata: Record<string, any>;
  documentId: string;
}

@Injectable()
export class VectorsService {
  constructor(
    @InjectModel(VectorChunk.name) private vectorChunkModel: Model<VectorChunkDocument>,
    private geminiService: GeminiService,
  ) {}

  async storeChunk(
    content: string,
    documentId: string,
    chunkIndex: number,
    metadata: Record<string, any> = {},
  ): Promise<VectorChunk> {
    // Generate embedding for the chunk
    const embedding = await this.geminiService.generateEmbedding(content);

    const vectorChunk = new this.vectorChunkModel({
      content,
      embedding,
      documentId,
      chunkIndex,
      metadata,
    });

    return vectorChunk.save();
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await this.vectorChunkModel.deleteMany({ documentId }).exec();
  }

  async search(query: string, topK: number = 5): Promise<SearchResult[]> {
    // Generate embedding for the query
    const queryEmbedding = await this.geminiService.generateEmbedding(query);

    // Get all chunks (in production, use a proper vector database)
    const allChunks = await this.vectorChunkModel.find().limit(1000).exec();

    // Calculate cosine similarity
    const results = allChunks.map((chunk) => {
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      return {
        content: chunk.content,
        similarity,
        metadata: chunk.metadata,
        documentId: chunk.documentId.toString(),
      };
    });

    // Sort by similarity and return top K
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async getChunkCount(documentId: string): Promise<number> {
    return this.vectorChunkModel.countDocuments({ documentId }).exec();
  }

  async getStats() {
    const totalChunks = await this.vectorChunkModel.countDocuments().exec();
    const uniqueDocuments = await this.vectorChunkModel.distinct('documentId').exec();
    
    return {
      totalChunks,
      totalDocuments: uniqueDocuments.length,
    };
  }
}
