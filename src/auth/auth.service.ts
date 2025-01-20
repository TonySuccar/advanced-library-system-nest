import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { CMS, CMSDocument } from 'src/library/cms/schemas/cms.schema';
import { User, UserDocument } from '../library/user/schemas/user.schema';
import { MailerService } from '../common/mailer.service'; // Import MailerService
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import {
  Author,
  AuthorDocument,
} from 'src/library/author/schemas/author.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(CMS.name) private cmsModel: Model<CMSDocument>,
    @InjectModel(Author.name) private authorModel: Model<AuthorDocument>,
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly mailerService: MailerService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(email: string, name: string) {
    const existingUser = await this.userModel.findOne({ email });

    if (existingUser) {
      throw new BadRequestException('Email is already ine use.');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.otpModel.findOneAndUpdate(
      { email },
      { email, code: otpCode, expiresAt, name },
      { upsert: true, new: true },
    );

    const subject = 'Your OTP Code';
    const text = `Dear ${name}, your OTP code is: ${otpCode}`;
    const html = `<p>Dear ${name}, your OTP code is: <strong>${otpCode}</strong></p>`;

    await this.mailerService.sendEmail(email, subject, text, html);

    return { message: 'OTP sent to your email.' };
  }

  async confirm(email: string, otp: string, password: string, age: number) {
    const otpEntry = await this.otpModel.findOne({ email, code: otp });

    if (!otpEntry || otpEntry.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired OTP.');
    }

    await this.otpModel.deleteOne({ email, code: otp });

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('User already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const memberId = `MEM${Math.floor(100000 + Math.random() * 900000)}`;

    const newUser = await this.userModel.create({
      memberId,
      email,
      password: hashedPassword,
      returnRate: 100,
      borrowHistory: [],
      age: age,
      role: 'member',
      name: otpEntry.name,
    });

    return {
      message: 'OTP verified successfully, user created.',
      user: {
        name: newUser.name,
        memberId: newUser.memberId,
        email: newUser.email,
        returnRate: newUser.returnRate,
        age: newUser.age,
      },
    };
  }
  async login(email: string, password: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || '123',
      expiresIn: '1h',
    });

    return {
      message: 'Login successful',
      accessToken: token,
      user: {
        memberId: user.memberId,
        email: user.email,
        role: user.role,
      },
    };
  }
  async CMSlogin(email: string, password: string) {
    const mycms = await this.cmsModel.findOne({ email });
    if (!mycms) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(password, mycms.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload = {
      sub: mycms._id,
      email: mycms.email,
      role: mycms.role,
    };
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || '123',
      expiresIn: '1h',
    });

    return {
      message: 'Login successful',
      accessToken: token,
      user: {
        email: mycms.email,
        role: mycms.role,
      },
    };
  }
  async Authorlogin(email: string, password: string) {
    const myauthor = await this.authorModel.findOne({ email });
    if (!myauthor) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(password, myauthor.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload = {
      sub: myauthor._id,
      email: myauthor.email,
      role: myauthor.role,
    };
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || '123',
      expiresIn: '1h',
    });

    return {
      message: 'Login successful',
      accessToken: token,
      user: {
        email: myauthor.email,
        role: myauthor.role,
      },
    };
  }
}
