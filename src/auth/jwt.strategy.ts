import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../library/user/schemas/user.schema';
import { CMS, CMSDocument } from 'src/library/cms/schemas/cms.schema';
import { Author } from 'src/library/author/schemas/author.schema';
import { JwtPayload } from 'src/types/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(CMS.name) private readonly cmsModel: Model<CMSDocument>,
    @InjectModel(Author.name) private readonly authorModel: Model<CMSDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || '123',
      passReqToCallback: true,
    });
  }

  async validate(req: JwtPayload, payload: JwtPayload) {
    console.log('JWT Payload:', payload);
    let user;

    const { sub, role } = payload;
    if (role === 'member') {
      user = await this.userModel.findById(sub);
    } else if (role === 'admin' || role === 'intern') {
      user = await this.cmsModel.findById(sub);
    } else if (role === 'author') {
      user = await this.authorModel.findById(sub);
    }

    if (!user) {
      throw new UnauthorizedException('User not found. Please log in.');
    }
    console.log('Validated User:', user);

    return {
      userId: user._id,
      email: user.email,
      role: user.role,
    };
  }
}
