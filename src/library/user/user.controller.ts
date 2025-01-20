import {
  Controller,
  Get,
  UseGuards,
  Req,
  Post,
  Param,
  Patch,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserService } from './user.service';
import { AuthenticatedRequest } from 'src/types/auth.types';

@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @Roles('member')
  async getUserProfile(@Req() req) {
    const userId = req.user.userId;
    try {
      const user = await this.userService.getUserById(userId);
      if (!user) {
        return {
          message: 'User not found',
          data: null,
        };
      }
      return {
        message: 'User profile fetched successfully',
        data: user,
      };
    } catch (error) {
      return {
        message: 'An error occurred while fetching the user profile',
        error: error.message,
      };
    }
  }

  @Post('borrow-book/:branchInventoryId')
  @Roles('member')
  async borrowBook(
    @Param('branchInventoryId') branchInventoryId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId } = req.user;

    return this.userService.borrowBook(branchInventoryId, userId);
  }

  @Post('run-overdue-handler')
  @Roles('admin')
  async runOverdueHandler() {
    await this.userService.handleOverdueBooks();
    return { message: 'Scheduler function executed successfully' };
  }

  @Patch('return/:borrowId')
  @Roles('member')
  async returnBook(
    @Param('borrowId') borrowId: string,
    @Body('feedback') feedback: string,
  ) {
    return this.userService.returnBook(borrowId, feedback);
  }

  @Post('review/:bookId')
  @Roles('member')
  async addReview(
    @Param('bookId') bookId: string,
    @Body('review') review: string,
    @Body('rating') rating: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const memberId = req.user.userId;
    return this.userService.addReview(bookId, memberId, review, rating);
  }

  @Patch(':reviewId/toggle-like')
  @Roles('member')
  async toggleLike(
    @Param('reviewId') reviewId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    return this.userService.toggleLike(reviewId, userId);
  }
}
