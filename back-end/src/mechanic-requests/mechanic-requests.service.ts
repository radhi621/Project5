import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MechanicRequest,
  MechanicRequestDocument,
} from './schemas/mechanic-request.schema';
import { Mechanic, MechanicDocument } from '../mechanics/schemas/mechanic.schema';
import { CreateMechanicRequestDto } from './dto/mechanic-request.dto';

@Injectable()
export class MechanicRequestsService {
  constructor(
    @InjectModel(MechanicRequest.name)
    private mechanicRequestModel: Model<MechanicRequestDocument>,
    @InjectModel(Mechanic.name)
    private mechanicModel: Model<MechanicDocument>,
  ) {}

  // Create new request from user to specific mechanic
  async create(createDto: CreateMechanicRequestDto, userId: string) {
    const request = new this.mechanicRequestModel({
      userId: new Types.ObjectId(userId) as any,
      userName: createDto.userName,
      userEmail: createDto.userEmail,
      userPhone: createDto.userPhone,
      mechanicId: new Types.ObjectId(createDto.mechanicId) as any,
      mechanicName: createDto.mechanicName,
      mechanicEmail: createDto.mechanicEmail,
      status: 'pending',
      messages: [],
    });

    return request.save();
  }

  // Get all chat history for admin
  async findAllChats() {
    return this.mechanicRequestModel
      .find({})
      .sort({ createdAt: -1 })
      .exec();
  }

  // Get pending requests for specific mechanic only
  async findAllPending(userEmail: string) {
    return this.mechanicRequestModel
      .find({ 
        mechanicEmail: userEmail.toLowerCase(),
        status: 'pending' 
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Get user's requests (all statuses)
  async findByUser(userId: string) {
    return this.mechanicRequestModel
      .find({ userId: new Types.ObjectId(userId) as any })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Get mechanic's chat sessions (active, completed, reopen-requested)
  async findByMechanic(userEmail: string) {
    return this.mechanicRequestModel
      .find({
        mechanicEmail: userEmail.toLowerCase(),
        status: { $in: ['pending', 'active', 'completed', 'reopen-requested'] },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Get single request by ID
  async findOne(id: string) {
    const request = await this.mechanicRequestModel.findById(id).exec();
    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }
    return request;
  }

  // Mechanic accepts request - opens chat
  async acceptRequest(id: string, userEmail: string) {
    const request = await this.mechanicRequestModel.findById(id).exec();

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Check if the logged-in user's email matches the mechanic email in the request
    if (request.mechanicEmail.toLowerCase() !== userEmail.toLowerCase()) {
      throw new BadRequestException('Not authorized to accept this request');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request is no longer pending');
    }

    request.status = 'active';
    request.acceptedAt = new Date();

    return request.save();
  }

  // Mechanic completes/closes chat
  async completeRequest(id: string, userEmail: string) {
    const request = await this.mechanicRequestModel.findById(id).exec();

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.mechanicEmail.toLowerCase() !== userEmail.toLowerCase()) {
      throw new BadRequestException('Not authorized to complete this request');
    }

    if (request.status !== 'active') {
      throw new BadRequestException('Can only complete active chats');
    }

    request.status = 'completed';
    request.completedAt = new Date();
    request.completedByMechanic = true;

    return request.save();
  }

  // User requests to reopen completed chat
  async requestReopen(id: string, userId: string) {
    const request = await this.mechanicRequestModel.findById(id).exec();

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.userId.toString() !== userId) {
      throw new BadRequestException('Not authorized');
    }

    if (request.status !== 'completed') {
      throw new BadRequestException('Can only reopen completed chats');
    }

    request.status = 'reopen-requested';
    request.reopenRequestedAt = new Date();

    return request.save();
  }

  // Mechanic accepts reopen request
  async acceptReopen(id: string, userEmail: string) {
    const request = await this.mechanicRequestModel.findById(id).exec();

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.mechanicEmail.toLowerCase() !== userEmail.toLowerCase()) {
      throw new BadRequestException('Not authorized');
    }

    if (request.status !== 'reopen-requested') {
      throw new BadRequestException('No reopen request pending');
    }

    request.status = 'active';

    return request.save();
  }

  // User cancels request
  async cancelRequest(id: string, userId: string) {
    const request = await this.mechanicRequestModel.findById(id).exec();

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.userId.toString() !== userId) {
      throw new BadRequestException('Not authorized');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Can only cancel pending requests');
    }

    request.status = 'cancelled';
    return request.save();
  }
}
