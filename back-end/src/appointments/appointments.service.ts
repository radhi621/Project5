import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';
import { ActivityService } from '../activity/activity.service';
import { MechanicsService } from '../mechanics/mechanics.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
    private activityService: ActivityService,
    private mechanicsService: MechanicsService,
  ) {}

  async create(createAppointmentDto: CreateAppointmentDto): Promise<Appointment> {
    const appointment = new this.appointmentModel(createAppointmentDto);
    const saved = await appointment.save();
    
    // Log activity
    await this.activityService.log(
      'appointment',
      'New appointment created',
      saved.userId.toString(),
      saved.userName,
      { mechanic: saved.mechanicName, shop: saved.shopName, date: saved.date },
    );
    
    return saved;
  }

  async findAll(status?: string, userId?: string): Promise<Appointment[]> {
    const filter: any = { isActive: true };
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (userId) {
      filter.userId = userId;
    }
    return this.appointmentModel.find(filter).sort({ date: -1 }).exec();
  }

  async findOne(id: string): Promise<Appointment> {
    const appointment = await this.appointmentModel.findById(id).exec();
    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }
    return appointment;
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto): Promise<Appointment> {
    const updated = await this.appointmentModel
      .findByIdAndUpdate(id, updateAppointmentDto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }
    return updated;
  }

  async updateStatus(id: string, status: string): Promise<Appointment> {
    const updated = await this.update(id, { status });
    
    // Log activity
    await this.activityService.log(
      'appointment',
      `Appointment status changed to ${status}`,
      updated.userId.toString(),
      updated.userName,
      { appointmentId: id, newStatus: status },
    );
    
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.appointmentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }
  }

  async getAvailableTimeSlots(mechanicId: string, date: string): Promise<string[]> {
    const allSlots = [
      '09:00-10:00', '10:00-11:00', '11:00-12:00',
      '12:00-13:00', '13:00-14:00', '14:00-15:00',
      '15:00-16:00', '16:00-17:00', '17:00-18:00'
    ];

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Get existing appointments for this mechanic on this date
    const existingAppointments = await this.appointmentModel.find({
      mechanicId,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['pending', 'confirmed'] },
      isActive: true,
    }).exec();

    // Filter out booked time slots
    const bookedSlots = existingAppointments.map(apt => apt.timeSlot);
    return allSlots.filter(slot => !bookedSlots.includes(slot));
  }

  async findByMechanic(mechanicId: string, status?: string): Promise<Appointment[]> {
    const filter: any = { mechanicId, isActive: true };
    if (status && status !== 'all') {
      filter.status = status;
    }
    return this.appointmentModel.find(filter).sort({ date: 1 }).exec();
  }

  async findByUser(userId: string, status?: string): Promise<Appointment[]> {
    const filter: any = { userId, isActive: true };
    if (status && status !== 'all') {
      filter.status = status;
    }
    return this.appointmentModel.find(filter).sort({ date: -1 }).exec();
  }

  async confirmAppointment(id: string): Promise<Appointment> {
    const updated = await this.appointmentModel
      .findByIdAndUpdate(
        id,
        { status: 'confirmed', confirmedAt: new Date() },
        { new: true }
      )
      .exec();
    if (!updated) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    await this.activityService.log(
      'appointment',
      'Appointment confirmed',
      updated.userId.toString(),
      updated.userName,
      { mechanic: updated.mechanicName, date: updated.date },
    );

    return updated;
  }

  async declineAppointment(id: string, reason?: string): Promise<Appointment> {
    const updated = await this.appointmentModel
      .findByIdAndUpdate(
        id,
        { status: 'declined', cancellationReason: reason },
        { new: true }
      )
      .exec();
    if (!updated) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    await this.activityService.log(
      'appointment',
      'Appointment declined',
      updated.userId.toString(),
      updated.userName,
      { mechanic: updated.mechanicName, reason },
    );

    return updated;
  }

  async cancelAppointment(id: string, reason?: string): Promise<Appointment> {
    const updated = await this.appointmentModel
      .findByIdAndUpdate(
        id,
        { status: 'cancelled', cancellationReason: reason },
        { new: true }
      )
      .exec();
    if (!updated) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return updated;
  }

  async completeAppointment(id: string): Promise<Appointment> {
    const updated = await this.appointmentModel
      .findByIdAndUpdate(
        id,
        { status: 'completed', completedAt: new Date() },
        { new: true }
      )
      .exec();
    if (!updated) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    // Increment mechanic's completed jobs count
    await this.mechanicsService.incrementCompletedJobs(updated.mechanicId.toString());

    await this.activityService.log(
      'appointment',
      'Appointment completed',
      updated.userId.toString(),
      updated.userName,
      { mechanic: updated.mechanicName, date: updated.date },
    );

    return updated;
  }

  async getStats(): Promise<any> {
    const total = await this.appointmentModel.countDocuments({ isActive: true }).exec();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await this.appointmentModel
      .countDocuments({
        isActive: true,
        date: { $gte: today, $lt: tomorrow },
      })
      .exec();

    const pending = await this.appointmentModel
      .countDocuments({ isActive: true, status: 'pending' })
      .exec();

    const confirmed = await this.appointmentModel
      .countDocuments({ isActive: true, status: 'confirmed' })
      .exec();

    const completed = await this.appointmentModel
      .countDocuments({ isActive: true, status: 'completed' })
      .exec();

    return {
      total,
      today: todayCount,
      pending,
      confirmed,
      completed,
    };
  }

  async getTodayAppointments(): Promise<Appointment[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.appointmentModel
      .find({
        isActive: true,
        date: { $gte: today, $lt: tomorrow },
      })
      .sort({ date: 1 })
      .exec();
  }
}
