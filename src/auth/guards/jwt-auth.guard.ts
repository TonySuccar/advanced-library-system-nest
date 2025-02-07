import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { JwtPayload } from '../../types/auth.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private static readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest<TUser = JwtPayload>(
    err: Error | null,
    user: TUser | null,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest<Request>();

    JwtAuthGuard.logger.log(
      `Authorization Header: ${request.headers.authorization}`,
      'JwtAuthGuard',
    );

    if (err || !user) {
      JwtAuthGuard.logger.error(
        'Authentication failed',
        err || info,
        'JwtAuthGuard',
      );
      throw new UnauthorizedException('Invalid or missing token.');
    }

    return user;
  }
}
