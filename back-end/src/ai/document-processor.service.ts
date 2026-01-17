import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as mammoth from 'mammoth';
import MarkdownIt from 'markdown-it';
const { PDFParse } = require('pdf-parse');

export interface DocumentChunk {
  content: string;
  chunkIndex: number;
  metadata: {
    source: string;
    page?: number;
  };
}

@Injectable()
export class DocumentProcessorService {
  private md = new MarkdownIt();

  async extractText(filePath: string, mimeType: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);

    switch (mimeType) {
      case 'application/pdf':
        return this.extractFromPDF(buffer);
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.extractFromWord(buffer);
      case 'text/plain':
        return buffer.toString('utf-8');
      case 'text/markdown':
        return this.extractFromMarkdown(buffer.toString('utf-8'));
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  private async extractFromPDF(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text;
  }

  private async extractFromWord(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  private extractFromMarkdown(content: string): Promise<string> {
    // Convert markdown to plain text
    const html = this.md.render(content);
    const text = html.replace(/<[^>]*>/g, '');
    return Promise.resolve(text);
  }

  chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          chunkIndex: chunkIndex++,
          metadata: { source: 'document' },
        });

        // Keep overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk += sentence;
      }
    }

    // Add the last chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        chunkIndex: chunkIndex++,
        metadata: { source: 'document' },
      });
    }

    return chunks;
  }

  async processDocument(filePath: string, mimeType: string): Promise<DocumentChunk[]> {
    const text = await this.extractText(filePath, mimeType);
    return this.chunkText(text);
  }
}
