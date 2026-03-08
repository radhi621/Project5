import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { readFileSync } from 'fs';
import { Chat, ChatDocument } from './schemas/chat.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { VectorsService } from '../vectors/vectors.service';
import { GeminiService } from '../ai/gemini.service';
import { CreateChatDto, CreateMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private vectorsService: VectorsService,
    private geminiService: GeminiService,
  ) {}

  async createChat(createChatDto: CreateChatDto): Promise<Chat> {
    const chat = new this.chatModel(createChatDto);
    return chat.save();
  }

  async findAllChats(userId?: string): Promise<Chat[]> {
    const filter: any = { isActive: true };
    if (userId) {
      filter.userId = userId;
    }
    return this.chatModel.find(filter).populate('userId', 'name email').sort({ updatedAt: -1 }).exec();
  }

  async findChatById(id: string): Promise<Chat> {
    const chat = await this.chatModel.findById(id).exec();
    if (!chat) {
      throw new NotFoundException(`Chat with ID ${id} not found`);
    }
    return chat;
  }

  async deleteChat(id: string): Promise<void> {
    const chat = await this.findChatById(id);
    await this.messageModel.deleteMany({ chatId: id }).exec();
    await this.chatModel.findByIdAndDelete(id).exec();
  }

  async getMessages(chatId: string): Promise<Message[]> {
    return this.messageModel.find({ chatId }).sort({ createdAt: 1 }).exec();
  }

  async sendMessage(
    createMessageDto: CreateMessageDto | any,
    files?: Express.Multer.File[],
  ): Promise<{ userMessage: Message; aiMessage: Message }> {
    const { chatId, content } = createMessageDto;

    // Verify chat exists
    await this.findChatById(chatId);

    // Save user message
    const userMessage = new this.messageModel({
      chatId,
      role: 'user',
      content,
      attachments: files?.map(f => ({
        filename: f.filename,
        originalName: f.originalname,
        mimetype: f.mimetype,
        path: f.path,
      })),
    });
    await userMessage.save();

    let context = '';
    let sources: string[] = [];

    try {
      // Perform RAG search
      const searchResults = await this.vectorsService.search(content, 5);
      
      // Build context from search results
      context = searchResults
        .map((result, index) => `[${index + 1}] ${result.content}`)
        .join('\n\n');

      // Extract source document IDs
      sources = [...new Set(searchResults.map(r => r.documentId))];
    } catch (error) {
      console.log('RAG search failed, proceeding without context:', error.message);
      // Continue without RAG context if search fails
    }

    // Generate AI response with files if provided
    let aiResponse: string;

    // Fetch prior messages for conversation history (exclude the message just saved)
    const priorMessages = await this.messageModel
      .find({ chatId })
      .sort({ createdAt: 1 })
      .exec();
    const history = priorMessages
      .filter(m => m._id.toString() !== userMessage._id.toString())
      .map(m => ({ role: m.role === 'user' ? 'user' : 'model' as 'user' | 'model', text: m.content }));

    if (files && files.length > 0) {
      aiResponse = await this.geminiService.generateResponseWithImages(content, context, files);
    } else {
      aiResponse = await this.geminiService.generateResponseWithHistory(content, context, history);
    }

    // Save AI message
    const aiMessage = new this.messageModel({
      chatId,
      role: 'assistant',
      content: aiResponse,
      sources,
    });
    await aiMessage.save();

    return { userMessage, aiMessage };
  }

  async getStats() {
    const totalChats = await this.chatModel.countDocuments({ isActive: true }).exec();
    const totalMessages = await this.messageModel.countDocuments().exec();
    
    const recentChats = await this.chatModel
      .find({ isActive: true })
      .sort({ updatedAt: -1 })
      .limit(10)
      .exec();

    return {
      totalChats,
      totalMessages,
      avgMessagesPerChat: totalChats > 0 ? Math.round(totalMessages / totalChats) : 0,
      recentChats,
    };
  }
}
