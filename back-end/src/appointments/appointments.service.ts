import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
    private activityService: ActivityService,
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
