import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '../../types/auth.types';
import { Socket } from 'socket.io';

@Injectable()
export class WebSocketAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    try {
      const token = this.extractToken(client);
      const user = this.validateToken(token);

      if (user.role !== 'member') {
        throw new ForbiddenException('Only members can access the chat.');
      }

      client.data.user = user; // Attach user to client
      return true;
    } catch (error) {
      console.error('❌ WebSocket Authentication Failed:', error.message);
      client.emit('error', { message: 'Authentication failed.' });
      client.disconnect();
      return false;
    }
  }

  /**
   * 🔐 Extract JWT Token from WebSocket Query
   */
  private extractToken(client: Socket): string {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Missing authentication token.');
    }
    return token;
  }

  /**
   * 🔑 Validate JWT Token and Return User
   */
  private validateToken(token: string): JwtPayload {
    try {
      return jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key',
      ) as JwtPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid authentication token.', error);
    }
  }
}
