import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ChatService } from './chat.service';
import { CreateChatDto, CreateMessageDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  createChat(@Body() createChatDto: CreateChatDto, @Request() req: any) {
    // Attach user ID from token
    return this.chatService.createChat({
      ...createChatDto,
      userId: req.user.userId,
    });
  }

  @Get()
  findAllChats(@Query('userId') userId?: string, @Request() req?: any) {
    // Users can only see their own chats
    return this.chatService.findAllChats(req.user.userId);
  }

  @Get('stats')
  getStats() {
    return this.chatService.getStats();
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  findAllChatsAdmin() {
    return this.chatService.findAllChats();
  }

  @Get('admin/user/:userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  findChatsForUser(@Param('userId') userId: string) {
    return this.chatService.findAllChats(userId);
  }

  @Get(':id')
  findChatById(@Param('id') id: string) {
    return this.chatService.findChatById(id);
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string) {
    return this.chatService.getMessages(id);
  }

  @Post('message')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads/chat-files',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  sendMessage(
    @Body() createMessageDto: CreateMessageDto | any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.chatService.sendMessage(createMessageDto, files);
  }

  @Delete(':id')
  deleteChat(@Param('id') id: string) {
    return this.chatService.deleteChat(id);
  }
}
