import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UserService } from './user.service';

@Injectable()
export class TaskService {
  constructor(private readonly userService: UserService) {}

  @Cron('0 0 * * *')
  async handleDailyOverdueCheck() {
    console.log('Running daily overdue books check...');
    await this.userService.handleOverdueBooks();
    console.log('Daily overdue books check completed.');
  }
}
