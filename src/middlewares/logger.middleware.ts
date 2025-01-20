import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const reqTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const resTime = Date.now();
      const responseTime = resTime - reqTime;

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} - ${responseTime} ms`,
      );
    });

    next();
  }
}
