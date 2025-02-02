import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from './schemas/chat.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name)
    private readonly chatMessageModel: Model<ChatMessageDocument>,
  ) {}

  // 🔹 Store chat message in MongoDB
  async saveMessage(data: { userId: string; bookId: string; message: string }) {
    const chatMessage = new this.chatMessageModel({
      userId: new Types.ObjectId(data.userId),
      bookId: new Types.ObjectId(data.bookId),
      message: data.message,
    });

    return chatMessage.save();
  }

  // 🔹 Get previous messages of a book discussion
  async getMessages(bookId: string) {
    if (!Types.ObjectId.isValid(bookId)) {
      throw new NotFoundException('Invalid book ID');
    }

    return this.chatMessageModel
      .find({ bookId: new Types.ObjectId(bookId) })
      .populate('userId', 'name') // Populate user name
      .sort({ createdAt: 1 }) // Oldest messages first
      .exec();
  }
}
