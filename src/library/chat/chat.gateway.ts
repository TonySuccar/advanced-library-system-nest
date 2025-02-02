import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Book, BookDocument } from '../book/schemas/book.schema';
import { WebSocketAuthGuard } from '../../auth/guards/ws.guard';

@WebSocketGateway({ cors: { origin: '*' } }) // Enable CORS for WebSockets
@UseGuards(WebSocketAuthGuard) // ✅ Apply WebSocketAuthGuard
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>, // Inject BookModel
  ) {}

  handleConnection(client: Socket) {
    console.log(` Client connected: ${client.id}`);
  }
  /**
   * 🔌 Handle WebSocket disconnection
   */
  handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);
  }

  /**
   * 🏠 Join a book discussion room
   */
  @SubscribeMessage('joinRoom')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() bookId: string,
  ) {
    if (!Types.ObjectId.isValid(bookId)) {
      return client.emit('error', { message: 'Invalid book ID' });
    }

    // ✅ Validate if the book exists
    const book = await this.bookModel.findById(bookId).select('_id');
    if (!book) {
      return client.emit('error', { message: 'Book not found in database' });
    }

    const roomId = `book_${bookId}`;
    client.join(roomId);
    console.log(`📚 Client ${client.data.user.email} joined room: ${roomId}`);

    // Fetch previous messages and send to the client
    const messages = await this.chatService.getMessages(bookId);
    client.emit('chatHistory', messages);
  }

  /**
   * 📨 Send a message in the book discussion room
   */
  @SubscribeMessage('sendMessage')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookId: string; message: string },
  ) {
    const { bookId, message } = data;
    const user = client.data.user;

    if (!Types.ObjectId.isValid(bookId)) {
      return client.emit('error', { message: 'Invalid book ID' });
    }

    // ✅ Validate if the book exists
    const book = await this.bookModel.findById(bookId).select('_id');
    if (!book) {
      return client.emit('error', { message: 'Book not found in database' });
    }

    // Save message in DB
    const savedMessage = await this.chatService.saveMessage({
      userId: user.sub,
      bookId,
      message,
    });

    // Broadcast message to everyone in the room
    const roomId = `book_${bookId}`;
    this.server.to(roomId).emit('newMessage', savedMessage);
  }
}
