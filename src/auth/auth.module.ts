import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { Otp, OtpSchema } from './schemas/otp.schema'; // Import OTP schema
import { User, UserSchema } from '../library/user/schemas/user.schema'; // Import User schema
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { MailerService } from '../common/mailer.service';
import { CMS, CMSSchema } from 'src/library/cms/schemas/cms.schema';
import { Author, AuthorSchema } from 'src/library/author/schemas/author.schema';
import { WebSocketAuthGuard } from './guards/ws.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || '123',
      signOptions: { expiresIn: '1h' },
    }),
    MongooseModule.forFeature([
      { name: Otp.name, schema: OtpSchema },
      { name: User.name, schema: UserSchema },
      { name: CMS.name, schema: CMSSchema },
      { name: Author.name, schema: AuthorSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MailerService, WebSocketAuthGuard],
  exports: [AuthService, JwtModule, WebSocketAuthGuard],
})
export class AuthModule {}
