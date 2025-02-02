import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from './auth/auth.module';
import { LoggerMiddleware } from './middlewares/logger.middleware';

import { UserModule } from './library/user/user.module';
import { BookModule } from './library/book/book.module';
import { JwtModule } from '@nestjs/jwt';
import { CMSModule } from './library/cms/cms.module';
import { BranchModule } from './library/branch/branch.module';
import { AuthorModule } from './library/author/author.module';
import { ScheduleModule } from '@nestjs/schedule';
import { DashboardModule } from './library/Dashboard/dashboard.module';
import { ChatModule } from './library/chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || '123',
      signOptions: { expiresIn: '1h' },
    }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    AuthModule,
    UserModule,
    BookModule,
    CMSModule,
    BranchModule,
    AuthorModule,
    DashboardModule,
    ChatModule,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
