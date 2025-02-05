import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { WebSocketAuthGuard } from '../../auth/guards/ws.guard';

@WebSocketGateway({ cors: { origin: '*' } })
@UseGuards(WebSocketAuthGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private activeUsers = new Map<string, Set<string>>();

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    const user = client.data.user;
    if (user) {
      const userRooms = this.activeUsers.get(user.sub);
      if (userRooms) {
        userRooms.forEach((room) => client.leave(room));
        this.activeUsers.delete(user.sub);
      }
    }
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() bookId: string,
  ) {
    try {
      await this.chatService.checkIfBookExists(bookId);
      const user = await this.chatService.getUserInfo(client.data.user.email);
      const roomId = `book_${bookId}`;

      if (
        this.activeUsers.has(user._id.toString()) &&
        this.activeUsers.get(user._id.toString())?.has(roomId)
      ) {
        return client.emit('error', {
          message: 'You are already in this room.',
        });
      }

      client.join(roomId);
      console.log(`Client ${user.name} joined room: ${roomId}`);

      if (!this.activeUsers.has(user._id.toString())) {
        this.activeUsers.set(user._id.toString(), new Set());
      }
      this.activeUsers.get(user._id.toString())?.add(roomId);

      const messages = await this.chatService.getMessages(bookId);
      client.emit('chatHistory', messages);

      this.server.to(roomId).emit('userJoined', {
        message: `${user.name} has joined the chat.`,
        userId: user._id.toString(),
        userName: user.name,
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookId: string; message: string },
  ) {
    try {
      const { bookId, message } = data;
      const user = client.data.user;
      const roomId = `book_${bookId}`;

      await this.chatService.checkIfBookExists(bookId);

      if (!this.activeUsers.get(user.sub)?.has(roomId)) {
        throw new ForbiddenException(
          'You must join the room before sending messages.',
        );
      }

      const userInfo = await this.chatService.getUserInfo(user.email);

      const savedMessage = await this.chatService.saveMessage({
        userId: user.sub,
        bookId,
        message,
      });

      this.server.to(roomId).emit('newMessage', {
        message: savedMessage.message,
        userId: savedMessage.userId,
        userName: userInfo.name,
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }
}
