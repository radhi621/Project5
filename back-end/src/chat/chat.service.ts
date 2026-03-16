import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Chat, ChatDocument } from './schemas/chat.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { ReceiptIntake, ReceiptIntakeDocument } from './schemas/receipt-intake.schema';
import { ServiceReceipt, ServiceReceiptDocument } from './schemas/service-receipt.schema';
import { VectorsService } from '../vectors/vectors.service';
import { GeminiService } from '../ai/gemini.service';
import { CreateChatDto, CreateMessageDto } from './dto/chat.dto';
import { MechanicsService } from '../mechanics/mechanics.service';

type IntakeField =
  | 'mechanicEmail'
  | 'customerName'
  | 'customerEmail'
  | 'customerPhone'
  | 'serviceType'
  | 'partsUsed'
  | 'laborHours'
  | 'laborRate'
  | 'partsCost'
  | 'notes';

type AuthUser = {
  userId: string;
  email: string;
  role: 'user' | 'admin' | 'mechanic';
};

@Injectable()
export class ChatService {
  private readonly receiptStepsByRole: Record<'admin' | 'mechanic', IntakeField[]> = {
    admin: [
      'mechanicEmail',
      'customerName',
      'customerEmail',
      'customerPhone',
      'serviceType',
      'partsUsed',
      'laborHours',
      'laborRate',
      'partsCost',
      'notes',
    ],
    mechanic: [
      'customerName',
      'customerEmail',
      'customerPhone',
      'serviceType',
      'partsUsed',
      'laborHours',
      'laborRate',
      'partsCost',
      'notes',
    ],
  };

  private readonly receiptQuestions: Record<IntakeField, string> = {
    mechanicEmail: 'What is the mechanic email this receipt should be assigned to?',
    customerName: 'What is the customer full name?',
    customerEmail: 'What is the customer email?',
    customerPhone: 'What is the customer phone number? (type "skip" if not available)',
    serviceType: 'What service was performed?',
    partsUsed: 'List parts used (comma separated). Type "none" if no parts were used.',
    laborHours: 'How long did the job take (in hours)? Example: 2 or 1.5',
    laborRate: 'What is the labor cost per hour?',
    partsCost: 'What is the parts cost?',
    notes: 'Any additional notes for this service receipt? (type "none" if no notes)',
  };

  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(ReceiptIntake.name) private receiptIntakeModel: Model<ReceiptIntakeDocument>,
    @InjectModel(ServiceReceipt.name) private serviceReceiptModel: Model<ServiceReceiptDocument>,
    private vectorsService: VectorsService,
    private geminiService: GeminiService,
    private mechanicsService: MechanicsService,
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

  private isReceiptTrigger(content: string): boolean {
    const normalized = content.toLowerCase();
    return (
      normalized.includes('service receipt') ||
      normalized.includes('create receipt') ||
      normalized.includes('generate receipt')
    );
  }

  private getCurrentQuestion(draft: ReceiptIntakeDocument): string | null {
    const steps = this.receiptStepsByRole[draft.userRole];
    const field = steps[draft.currentStep];
    if (!field) {
      return null;
    }
    return this.receiptQuestions[field];
  }

  private parseCurrency(raw: string): number {
    const parsed = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private applyIntakeAnswer(draft: ReceiptIntakeDocument, answer: string): void {
    const steps = this.receiptStepsByRole[draft.userRole];
    const field = steps[draft.currentStep];
    const value = answer.trim();

    if (!field) {
      return;
    }

    switch (field) {
      case 'mechanicEmail':
        draft.data.mechanicEmail = value.toLowerCase();
        break;
      case 'customerName':
        draft.data.customerName = value;
        break;
      case 'customerEmail':
        draft.data.customerEmail = value.toLowerCase();
        break;
      case 'customerPhone':
        draft.data.customerPhone = value.toLowerCase() === 'skip' ? '' : value;
        break;
      case 'serviceType':
        draft.data.serviceType = value;
        break;
      case 'partsUsed':
        draft.data.partsUsed =
          value.toLowerCase() === 'none'
            ? []
            : value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
        break;
      case 'laborHours':
        draft.data.laborHours = this.parseCurrency(value);
        break;
      case 'laborRate':
        draft.data.laborRate = this.parseCurrency(value);
        break;
      case 'partsCost':
        draft.data.partsCost = this.parseCurrency(value);
        break;
      case 'notes':
        draft.data.notes = value.toLowerCase() === 'none' ? '' : value;
        break;
      default:
        break;
    }

    draft.markModified('data');
    draft.currentStep += 1;
  }

  private async finalizeIntake(draft: ReceiptIntakeDocument): Promise<string> {
    try {
      const assignedMechanicEmail = (draft.data.mechanicEmail || '').toLowerCase();
      const mechanic = await this.mechanicsService.findByEmail(assignedMechanicEmail);

      if (!mechanic) {
        if (draft.userRole === 'admin') {
          draft.currentStep = 0;
          draft.data.mechanicEmail = undefined;
          await draft.save();
          return 'I could not find an active mechanic with that email. Please provide a valid mechanic email to continue.';
        }

        draft.status = 'cancelled';
        await draft.save();
        return 'Unable to map your account to an active mechanic profile, so the receipt could not be stored. Please contact admin.';
      }

      const laborHours = draft.data.laborHours ?? 0;
      const laborRate = draft.data.laborRate ?? 0;
      const laborCost = laborHours * laborRate;
      const partsCost = draft.data.partsCost ?? 0;
      const totalCost = laborCost + partsCost;

      const receipt = new this.serviceReceiptModel({
        mechanicId: mechanic._id,
        mechanicName: mechanic.name,
        mechanicEmail: mechanic.email,
        createdByUserId: draft.userId,
        createdByRole: draft.userRole,
        chatId: draft.chatId,
        customerName: draft.data.customerName || 'Unknown Customer',
        customerEmail: draft.data.customerEmail || '',
        customerPhone: draft.data.customerPhone || '',
        serviceType: draft.data.serviceType || 'General Service',
        partsUsed: draft.data.partsUsed || [],
        laborHours,
        laborRate,
        laborCost,
        partsCost,
        totalCost,
        notes: draft.data.notes || '',
        status: 'final',
        source: 'ai-intake',
      });
      await receipt.save();

      const partsLabel = receipt.partsUsed.length > 0 ? receipt.partsUsed.join(', ') : 'None';
      let downloadLine = 'Download file was not generated. Please contact admin.';
      try {
        const receiptId = String(receipt._id);
        const fileName = `service-receipt-${receiptId}.txt`;
        const receiptDir = join(__dirname, '..', '..', 'uploads', 'receipts');
        mkdirSync(receiptDir, { recursive: true });

        const issueDate = new Date().toLocaleString('en-US');
        const referenceNo = `SR-${receiptId.slice(-8).toUpperCase()}`;
        const subtotal = laborCost + partsCost;
        const tax = 0;
        const grandTotal = subtotal + tax;

        const partLines =
          receipt.partsUsed.length > 0
            ? receipt.partsUsed.map((part, index) => `${index + 1}. ${part}`).join('\n')
            : '1. No replacement parts listed';

        const receiptText = [
          '============================================================',
          '                      SERVICE RECEIPT',
          '============================================================',
          `Receipt ID      : ${receiptId}`,
          `Reference No    : ${referenceNo}`,
          `Issued At       : ${issueDate}`,
          '',
          'SERVICE PROVIDER',
          '------------------------------------------------------------',
          `Mechanic Name   : ${receipt.mechanicName}`,
          `Mechanic Email  : ${receipt.mechanicEmail}`,
          '',
          'CUSTOMER DETAILS',
          '------------------------------------------------------------',
          `Customer Name   : ${receipt.customerName}`,
          `Customer Email  : ${receipt.customerEmail}`,
          `Customer Phone  : ${receipt.customerPhone || 'N/A'}`,
          '',
          'SERVICE DETAILS',
          '------------------------------------------------------------',
          `Service Type    : ${receipt.serviceType}`,
          'Parts Used:',
          partLines,
          '',
          'COST BREAKDOWN',
          '------------------------------------------------------------',
          `Time Spent      : ${laborHours.toFixed(2)} hour(s)`,
          `Hourly Rate     : $${laborRate.toFixed(2)}`,
          `Labor Formula   : ${laborHours.toFixed(2)} x $${laborRate.toFixed(2)} = $${laborCost.toFixed(2)}`,
          `Labor Cost      : $${laborCost.toFixed(2)}`,
          `Parts Cost      : $${partsCost.toFixed(2)}`,
          `Subtotal        : $${subtotal.toFixed(2)}`,
          `Tax             : $${tax.toFixed(2)}`,
          `TOTAL           : $${grandTotal.toFixed(2)}`,
          '',
          'NOTES',
          '------------------------------------------------------------',
          `${receipt.notes || 'No additional notes provided.'}`,
          '',
          'This receipt was generated through AutoDiag AI intake flow.',
          'For corrections, contact the assigned mechanic or admin team.',
          '============================================================',
        ].join('\n');

        writeFileSync(join(receiptDir, fileName), receiptText, 'utf8');
        receipt.fileName = fileName;
        receipt.filePath = `uploads/receipts/${fileName}`;
        receipt.fileUrl = `/uploads/receipts/${fileName}`;
        await receipt.save();
        downloadLine = `Download: http://localhost:3001${receipt.fileUrl}`;
      } catch (error) {
        console.error('Receipt file generation failed:', error);
      }

      draft.status = 'completed';
      await draft.save();

      return [
        `Service receipt created successfully for ${receipt.customerName}.`,
        `Receipt ID: ${receipt._id}`,
        `Assigned Mechanic: ${receipt.mechanicName}`,
        `Service: ${receipt.serviceType}`,
        `Parts: ${partsLabel}`,
        `Labor Calculation: ${laborHours.toFixed(2)}h x $${laborRate.toFixed(2)}/h = $${laborCost.toFixed(2)}`,
        `Labor: $${laborCost.toFixed(2)} | Parts: $${partsCost.toFixed(2)} | Total: $${totalCost.toFixed(2)}`,
        downloadLine,
        'This receipt is now available in the mechanic dashboard Receipts tab.',
      ].join('\n');
    } catch (error: any) {
      console.error('Receipt finalize failed:', error);
      try {
        draft.status = 'cancelled';
        await draft.save();
      } catch {
        // swallow secondary failure
      }
      return `Receipt finalization failed: ${error?.message || 'Unknown error'}`;
    }
  }

  private async handleReceiptIntakeMessage(chatId: string, content: string, authUser?: AuthUser): Promise<string | null> {
    if (!authUser) {
      return null;
    }

    const existingDraft = await this.receiptIntakeModel
      .findOne({ chatId, status: 'active' })
      .sort({ createdAt: -1 })
      .exec();

    if (!existingDraft && !this.isReceiptTrigger(content)) {
      return null;
    }

    if (authUser.role === 'user') {
      return 'Service receipt intake is only available for admin and mechanic roles.';
    }

    if (existingDraft) {
      if (['cancel', 'cancel receipt', 'stop receipt'].includes(content.trim().toLowerCase())) {
        existingDraft.status = 'cancelled';
        await existingDraft.save();
        return 'Service receipt intake cancelled.';
      }

      this.applyIntakeAnswer(existingDraft, content);
      const nextQuestion = this.getCurrentQuestion(existingDraft);

      if (nextQuestion) {
        await existingDraft.save();
        return nextQuestion;
      }

      return this.finalizeIntake(existingDraft);
    }

    const role = authUser.role as 'admin' | 'mechanic';
    const initialData = role === 'mechanic' ? { mechanicEmail: authUser.email.toLowerCase() } : {};

    const draft = new this.receiptIntakeModel({
      chatId,
      userId: authUser.userId,
      userRole: role,
      status: 'active',
      currentStep: 0,
      data: initialData,
    });
    await draft.save();

    const firstQuestion = this.getCurrentQuestion(draft) || 'Please provide the next receipt detail.';
    return [
      "Let's create a service receipt.",
      'I will ask one question at a time and generate the receipt at the end.',
      firstQuestion,
    ].join('\n');
  }

  async findReceiptsForMechanic(mechanicEmail: string): Promise<ServiceReceipt[]> {
    return this.serviceReceiptModel
      .find({ mechanicEmail: mechanicEmail.toLowerCase() })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAllReceipts(): Promise<ServiceReceipt[]> {
    return this.serviceReceiptModel.find().sort({ createdAt: -1 }).exec();
  }

  async sendMessage(
    createMessageDto: CreateMessageDto | any,
    files?: Express.Multer.File[],
    authUser?: AuthUser,
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

    let sources: string[] = [];

    // Role-protected receipt intake mode running through the default chat endpoint.
    // Users are blocked server-side even if they try to trigger the flow manually.
    const receiptIntakeResponse = await this.handleReceiptIntakeMessage(chatId, content, authUser);
    if (receiptIntakeResponse !== null && (!files || files.length === 0)) {
      const aiMessage = new this.messageModel({
        chatId,
        role: 'assistant',
        content: receiptIntakeResponse,
        sources: [],
      });
      await aiMessage.save();
      return { userMessage, aiMessage };
    }

    let context = '';

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
