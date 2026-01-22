import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentsService.create(createAppointmentDto);
  }

  @Get()
  findAll(@Query('status') status?: string, @Query('userId') userId?: string) {
    return this.appointmentsService.findAll(status, userId);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('admin')
  getStats() {
    return this.appointmentsService.getStats();
  }

  @Get('today')
  @UseGuards(RolesGuard)
  @Roles('admin', 'mechanic')
  getTodayAppointments() {
    return this.appointmentsService.getTodayAppointments();
  }

  @Get('mechanic/:mechanicId/availability')
  getAvailableSlots(
    @Param('mechanicId') mechanicId: string,
    @Query('date') date: string
  ) {
    return this.appointmentsService.getAvailableTimeSlots(mechanicId, date);
  }

  @Get('mechanic/:mechanicId')
  findByMechanic(
    @Param('mechanicId') mechanicId: string,
    @Query('status') status?: string
  ) {
    return this.appointmentsService.findByMechanic(mechanicId, status);
  }

  @Get('user/:userId')
  findByUser(
    @Param('userId') userId: string,
    @Query('status') status?: string
  ) {
    return this.appointmentsService.findByUser(userId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAppointmentDto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, updateAppointmentDto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.appointmentsService.updateStatus(id, status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }

  @Patch(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles('mechanic')
  confirmAppointment(@Param('id') id: string) {
    return this.appointmentsService.confirmAppointment(id);
  }

  @Patch(':id/decline')
  @UseGuards(RolesGuard)
  @Roles('mechanic')
  declineAppointment(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.appointmentsService.declineAppointment(id, reason);
  }

  @Patch(':id/cancel')
  cancelAppointment(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.appointmentsService.cancelAppointment(id, reason);
  }

  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles('mechanic')
  completeAppointment(@Param('id') id: string) {
    return this.appointmentsService.completeAppointment(id);
  }
}
