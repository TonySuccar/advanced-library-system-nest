import {
  Controller,
  Get,
  UseGuards,
  Req,
  Post,
  Param,
  Patch,
  Body,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserService } from './user.service';
import { AuthenticatedRequest } from 'src/types/auth.types';
import { UpdateMemberDto } from './dtos/update-member.dto';

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

  @Get('average-members-return-rate')
  @Roles('member', 'admin')
  async getAverageMembersReturnRate() {
    const averageRate = await this.userService.getAverageMembersReturnRate();
    return {
      message: 'Average members return rate retrieved successfully.',
      averageReturnRate: `${averageRate.toFixed(2)}%`,
    };
  }

  @Put(':memberId')
  @Roles('member')
  async updateMember(
    @Param('memberId') memberId: string,
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    const updatedMember = await this.userService.updateMember(
      memberId,
      updateMemberDto,
    );

    return {
      message: 'Member updated successfully.',
      member: updatedMember,
    };
  }

  @Delete(':memberId')
  @Roles('admin')
  async deleteMember(@Param('memberId') memberId: string) {
    return this.userService.deleteMember(memberId);
  }
  @Get()
  async getMembers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ) {
    return this.userService.getMembers(page, limit, search);
  }
}
