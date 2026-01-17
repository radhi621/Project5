import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { RagDocumentsService } from './rag-documents.service';
import { CreateRagDocumentDto, UpdateRagDocumentDto } from './dto/rag-document.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
 console.log('upload  documents');
@Controller('rag-documents')
@UseGuards(JwtAuthGuard)
export class RagDocumentsController {
  constructor(private readonly ragDocumentsService: RagDocumentsService) {}

  @Post('upload')
 
  
  @UseGuards(RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/rag-documents',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/markdown',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new BadRequestException('Only PDF, TXT, DOC, DOCX, and MD files are allowed'), false);
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() createRagDocumentDto: CreateRagDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.ragDocumentsService.create(createRagDocumentDto, file);
  }

  @Get()
  findAll(@Query('category') category?: string, @Query('status') status?: string) {
    return this.ragDocumentsService.findAll(category, status);
  }

  @Get('stats')
  getStats() {
    return this.ragDocumentsService.getStats();
  }

  @Get('by-category')
  getByCategory() {
    return this.ragDocumentsService.getByCategory();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ragDocumentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRagDocumentDto: UpdateRagDocumentDto) {
    return this.ragDocumentsService.update(id, updateRagDocumentDto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ragDocumentsService.updateStatus(id, status);
  }

  @Post(':id/vectorize')
  @UseGuards(RolesGuard)
  @Roles('admin')
  vectorizeDocument(@Param('id') id: string) {
    return this.ragDocumentsService.vectorizeDocument(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.ragDocumentsService.remove(id);
  }
}
