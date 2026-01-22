import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MechanicRequest, MechanicRequestDocument } from '../mechanic-requests/schemas/mechanic-request.schema';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>(); // userId -> socketId

  constructor(
    @InjectModel(MechanicRequest.name)
    private mechanicRequestModel: Model<MechanicRequestDocument>,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Remove from userSockets map
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('register')
  handleRegister(
    @MessageBody() data: { userId: string; role: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.userSockets.set(data.userId, client.id);
    console.log(`User ${data.userId} (${data.role}) registered with socket ${client.id}`);
  }

  @SubscribeMessage('join-chat')
  handleJoinChat(
    @MessageBody() data: { requestId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`chat-${data.requestId}`);
    console.log(`Client ${client.id} joined chat room: chat-${data.requestId}`);
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @MessageBody()
    data: {
      requestId: string;
      senderId: string;
      senderName: string;
      senderRole: 'user' | 'mechanic';
      content: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const message = {
        senderId: data.senderId,
        senderName: data.senderName,
        senderRole: data.senderRole,
        content: data.content,
        timestamp: new Date(),
      };

      // Save message to database
      await this.mechanicRequestModel.findByIdAndUpdate(
        data.requestId,
        { $push: { messages: message } },
        { new: true },
      );

      // Broadcast to chat room
      this.server.to(`chat-${data.requestId}`).emit('new-message', {
        requestId: data.requestId,
        message,
      });

      console.log(`Message sent in chat-${data.requestId} by ${data.senderName}`);
    } catch (error) {
      console.error('Error sending message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  // Notify user when mechanic accepts request
  notifyRequestAccepted(userId: string, requestId: string, mechanicName: string) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('request-accepted', {
        requestId,
        mechanicName,
        message: `${mechanicName} has accepted your request!`,
      });
      console.log(`Notified user ${userId} about accepted request`);
    }
  }

  // Notify all mechanics about new request
  notifyNewRequest(requestId: string, userName: string) {
    this.server.emit('new-request-notification', {
      requestId,
      userName,
      message: `New service request from ${userName}`,
    });
    console.log(`Broadcasted new request notification`);
  }

  // Notify when chat is completed
  notifyChatCompleted(userId: string, mechanicId: string, requestId: string) {
    // Broadcast to the chat room so both parties receive it
    this.server.to(`chat-${requestId}`).emit('chat-completed', { requestId });
    
    // Also send to individual sockets as backup
    const userSocketId = this.userSockets.get(userId);
    const mechanicSocketId = this.userSockets.get(mechanicId);

    if (userSocketId) {
      this.server.to(userSocketId).emit('chat-completed', { requestId });
    }
    if (mechanicSocketId) {
      this.server.to(mechanicSocketId).emit('chat-completed', { requestId });
    }
  }

  // Notify mechanic about reopen request
  notifyReopenRequest(mechanicId: string, requestId: string, userName: string) {
    const socketId = this.userSockets.get(mechanicId);
    if (socketId) {
      this.server.to(socketId).emit('reopen-requested', {
        requestId,
        userName,
        message: `${userName} wants to reopen the chat`,
      });
    }
  }
}
