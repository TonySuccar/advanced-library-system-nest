import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from './schemas/chat.schema';
import { Book, BookDocument } from '../book/schemas/book.schema';
import { User, UserDocument } from '../user/schemas/user.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name)
    private readonly chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(Book.name)
    private readonly bookModel: Model<BookDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async checkIfBookExists(bookId: string): Promise<void> {
    const bookObjectId = new Types.ObjectId(bookId);

    const book = await this.bookModel.findById(bookObjectId).select('_id');

    if (!book) {
      throw new NotFoundException('Book not found in database.');
    }
  }

  async saveMessage(data: { userId: string; bookId: string; message: string }) {
    await this.checkIfBookExists(data.bookId);

    const chatMessage = new this.chatMessageModel({
      userId: new Types.ObjectId(data.userId),
      bookId: new Types.ObjectId(data.bookId),
      message: data.message,
    });

    return chatMessage.save();
  }

  async getMessages(bookId: string) {
    await this.checkIfBookExists(bookId); // Ensure book exists

    return this.chatMessageModel
      .find({ bookId: new Types.ObjectId(bookId) })
      .populate('userId', 'name email')
      .sort({ createdAt: 1 })
      .exec();
  }

  async getUserInfo(email: string) {
    const user = await this.userModel
      .findOne({ email })
      .select('_id name email');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
