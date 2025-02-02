import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatMessage, ChatMessageSchema } from './schemas/chat.schema';
import { Book, BookSchema } from '../book/schemas/book.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
    MongooseModule.forFeature([{ name: Book.name, schema: BookSchema }]),
  ],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {}
