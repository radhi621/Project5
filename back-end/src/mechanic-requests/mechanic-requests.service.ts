import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MechanicRequest, MechanicRequestDocument } from './schemas/mechanic-request.schema';
import { CreateMechanicRequestDto, RespondToRequestDto } from './dto/mechanic-request.dto';

@Injectable()
export class MechanicRequestsService {
  constructor(
    @InjectModel(MechanicRequest.name)
    private mechanicRequestModel: Model<MechanicRequestDocument>,
  ) {}

  async create(createDto: CreateMechanicRequestDto, userId: string) {
    const request = new this.mechanicRequestModel({
      ...createDto,
      userId: new Types.ObjectId(userId),
      status: 'pending',
    });
    return request.save();
  }

  async findAllPending() {
    return this.mechanicRequestModel
      .find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    const request = await this.mechanicRequestModel.findById(id).exec();
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    return request;
  }

  async findByUser(userId: string) {
    return this.mechanicRequestModel
      .find({ userId: new Types.ObjectId(userId) as any })
      .sort({ createdAt: -1 })
      .exec();
  }

  async acceptRequest(
    id: string,
    mechanicId: string,
    mechanicName: string,
    mechanicEmail: string,
    responseDto: RespondToRequestDto,
  ) {
    const request = await this.mechanicRequestModel.findById(id).exec();
    
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request is no longer available');
    }

    request.status = 'accepted';
    request.acceptedBy = mechanicId as any;
    request.acceptedByName = mechanicName;
    request.acceptedByEmail = mechanicEmail;
    request.responseMessage = responseDto.responseMessage;
    request.respondedAt = new Date();

    return request.save();
  }

  async denyRequest(id: string, mechanicId: string, responseDto: RespondToRequestDto) {
    const request = await this.mechanicRequestModel.findById(id).exec();
    
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request is no longer available');
    }

    request.status = 'denied';
    request.responseMessage = responseDto.responseMessage;
    request.respondedAt = new Date();

    return request.save();
  }

  async cancelRequest(id: string, userId: string) {
    const request = await this.mechanicRequestModel.findById(id).exec();
    
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.userId.toString() !== userId) {
      throw new BadRequestException('Not authorized');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Cannot cancel a request that has been responded to');
    }

    request.status = 'cancelled';
    return request.save();
  }
}
