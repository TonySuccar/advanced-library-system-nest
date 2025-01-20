import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Roles('admin', 'intern')
  async getDashboard(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 5,
  ) {
    return this.dashboardService.getDashboardInsights(page, limit);
  }
  @Get('branch-analytics')
  @Roles('admin', 'intern')
  async getBranchAnalytics(
    @Query('branchId') branchId: string,
    @Query('timeFilter') timeFilter: 'day' | 'month' = 'day',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dashboardService.getBranchAnalytics(
      branchId,
      timeFilter,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
