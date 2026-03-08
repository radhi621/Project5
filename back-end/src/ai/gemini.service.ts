import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    const modelName = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.0-flash-exp';
    this.model = this.genAI.getGenerativeModel({ model: modelName });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Use Gemini embedding model from environment variable
    const embeddingModelName = this.configService.get<string>('EMBEDDING_MODEL') || 'text-embedding-004';
    const embeddingModel = this.genAI.getGenerativeModel({ model: embeddingModelName });
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  }

  async generateResponse(prompt: string, context: string): Promise<string> {
    const fullPrompt = `You are an automotive diagnostic assistant. Use the following context to answer the user's question accurately. If the context doesn't contain relevant information, provide general automotive knowledge.

Context:
${context}

User Question: ${prompt}

Answer:`;

    const result = await this.model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
  }

  async generateResponseStream(prompt: string, context: string) {
    const fullPrompt = `You are an automotive diagnostic assistant. Use the following context to answer the user's question accurately. If the context doesn't contain relevant information, provide general automotive knowledge.

Context:
${context}

User Question: ${prompt}

Answer:`;

    const result = await this.model.generateContentStream(fullPrompt);
    return result.stream;
  }

  async generateResponseWithImages(
    prompt: string,
    context: string,
    files: Express.Multer.File[],
  ): Promise<string> {
    const fullPrompt = `You are an automotive diagnostic assistant. Analyze the provided images along with the user's question. Use the following context if relevant. Provide detailed insights about what you see in the images related to automotive diagnostics.

Context:
${context}

User Question: ${prompt}

Please analyze the images and provide a comprehensive answer:`;

    // Prepare image data for Gemini
    const imageParts = files
      .filter(file => file.mimetype.startsWith('image/'))
      .map(file => ({
        inlineData: {
          data: readFileSync(file.path).toString('base64'),
          mimeType: file.mimetype,
        },
      }));

    // Create content with text and images
    const parts = [{ text: fullPrompt }, ...imageParts];

    const result = await this.model.generateContent(parts);
    const response = await result.response;
    return response.text();
  }

  async generateResponseWithHistory(
    prompt: string,
    context: string,
    history: { role: 'user' | 'model'; text: string }[],
  ): Promise<string> {
    const systemInstruction = `You are an automotive diagnostic assistant. Use the following knowledge base context when relevant to answer the user's question accurately. If the context doesn't contain relevant information, provide general automotive knowledge.

Context:
${context}`;

    const chat = this.model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemInstruction }] },
        { role: 'model', parts: [{ text: 'Understood. I am ready to assist with automotive diagnostics.' }] },
        ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      ],
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text();
  }
}
