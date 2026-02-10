import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MechanicRequestsService } from './mechanic-requests.service';
import { CreateMechanicRequestDto } from './dto/mechanic-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ChatGateway } from '../chat-gateway/chat.gateway';

@Controller('mechanic-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MechanicRequestsController {
  constructor(
    private readonly mechanicRequestsService: MechanicRequestsService,
    private readonly chatGateway: ChatGateway,
  ) {}

  // User creates new request to specific mechanic
  @Post()
  @Roles('user', 'admin')
  async create(@Body() createDto: CreateMechanicRequestDto, @Request() req: any) {
    const request = await this.mechanicRequestsService.create(
      createDto,
      req.user.userId,
    );

    // Notify mechanics about new request
    this.chatGateway.notifyNewRequest(request._id.toString(), createDto.userName);

    return request;
  }

  // Get all chat history (for admin)
  @Get('admin/all')
  @Roles('admin')
  findAllChats() {
    return this.mechanicRequestsService.findAllChats();
  }

  // Get all pending requests (for mechanics)
  @Get('pending')
  @Roles('mechanic', 'admin')
  findAllPending(@Request() req: any) {
    return this.mechanicRequestsService.findAllPending(req.user.email);
  }

  // Get user's own requests
  @Get('my-requests')
  @Roles('user', 'admin')
  findMyRequests(@Request() req: any) {
    return this.mechanicRequestsService.findByUser(req.user.userId);
  }

  // Get mechanic's chat sessions
  @Get('my-chats')
  @Roles('mechanic')
  findMyChats(@Request() req: any) {
    return this.mechanicRequestsService.findByMechanic(req.user.email);
  }

  // Get single request
  @Get(':id')
  @Roles('mechanic', 'admin', 'user')
  findOne(@Param('id') id: string) {
    return this.mechanicRequestsService.findOne(id);
  }

  // Mechanic accepts request
  @Patch(':id/accept')
  @Roles('mechanic')
  async acceptRequest(@Param('id') id: string, @Request() req: any) {
    const request = await this.mechanicRequestsService.acceptRequest(
      id,
      req.user.email,
    );

    // Notify user that request was accepted
    this.chatGateway.notifyRequestAccepted(
      request.userId.toString(),
      request._id.toString(),
      request.mechanicName,
    );

    return request;
  }

  // Mechanic completes/closes chat
  @Patch(':id/complete')
  @Roles('mechanic')
  async completeRequest(@Param('id') id: string, @Request() req: any) {
    const request = await this.mechanicRequestsService.completeRequest(
      id,
      req.user.email,
    );

    // Notify both parties
    this.chatGateway.notifyChatCompleted(
      request.userId.toString(),
      request.mechanicId.toString(),
      request._id.toString(),
    );

    return request;
  }

  // User requests to reopen
  @Patch(':id/reopen')
  @Roles('user', 'admin')
  async requestReopen(@Param('id') id: string, @Request() req: any) {
    const request = await this.mechanicRequestsService.requestReopen(
      id,
      req.user.userId,
    );

    // Notify mechanic
    this.chatGateway.notifyReopenRequest(
      request.mechanicId.toString(),
      request._id.toString(),
      request.userName,
    );

    return request;
  }

  // Mechanic accepts reopen request
  @Patch(':id/accept-reopen')
  @Roles('mechanic')
  async acceptReopen(@Param('id') id: string, @Request() req: any) {
    const request = await this.mechanicRequestsService.acceptReopen(
      id,
      req.user.email,
    );

    // Notify user
    this.chatGateway.notifyRequestAccepted(
      request.userId.toString(),
      request._id.toString(),
      request.mechanicName,
    );

    return request;
  }

  // User cancels request
  @Patch(':id/cancel')
  @Roles('user')
  cancelRequest(@Param('id') id: string, @Request() req: any) {
    return this.mechanicRequestsService.cancelRequest(id, req.user.userId);
  }
}
