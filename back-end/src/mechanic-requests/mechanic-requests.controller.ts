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
import { CreateMechanicRequestDto, RespondToRequestDto } from './dto/mechanic-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('mechanic-requests')
@UseGuards(JwtAuthGuard)
export class MechanicRequestsController {
  constructor(private readonly mechanicRequestsService: MechanicRequestsService) {}

  @Post()
  @Roles('user', 'mechanic')
  create(@Body() createDto: CreateMechanicRequestDto, @Request() req: any) {
    return this.mechanicRequestsService.create(createDto, req.user.userId);
  }

  @Get('pending')
  @Roles('mechanic', 'admin')
  findAllPending() {
    return this.mechanicRequestsService.findAllPending();
  }

  @Get('my-requests')
  @Roles('user', 'mechanic')
  findMyRequests(@Request() req: any) {
    return this.mechanicRequestsService.findByUser(req.user.userId);
  }

  @Get(':id')
  @Roles('mechanic', 'admin', 'user')
  findOne(@Param('id') id: string) {
    return this.mechanicRequestsService.findOne(id);
  }

  @Patch(':id/accept')
  @Roles('mechanic')
  acceptRequest(
    @Param('id') id: string,
    @Body() responseDto: RespondToRequestDto,
    @Request() req: any,
  ) {
    return this.mechanicRequestsService.acceptRequest(
      id,
      req.user.userId,
      req.user.user?.name || 'Mechanic',
      req.user.email,
      responseDto,
    );
  }

  @Patch(':id/deny')
  @Roles('mechanic')
  denyRequest(
    @Param('id') id: string,
    @Body() responseDto: RespondToRequestDto,
    @Request() req: any,
  ) {
    return this.mechanicRequestsService.denyRequest(id, req.user.userId, responseDto);
  }

  @Patch(':id/cancel')
  @Roles('user', 'mechanic')
  cancelRequest(@Param('id') id: string, @Request() req: any) {
    return this.mechanicRequestsService.cancelRequest(id, req.user.userId);
  }
}
