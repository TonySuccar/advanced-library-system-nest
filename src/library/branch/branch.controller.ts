import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dtos/create-branch.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('branch')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  // Create a new branch
  @Roles('admin')
  @Post()
  async create(@Body() createBranchDto: CreateBranchDto) {
    return this.branchService.create(createBranchDto);
  }

  // Get all branches
  @Roles('admin')
  @Get()
  async findAll() {
    return this.branchService.findAll();
  }

  // Get a specific branch by ID
  @Roles('admin')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.branchService.findOne(id);
  }

  // Update a branch by ID
  @Roles('admin')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBranchDto: CreateBranchDto,
  ) {
    return this.branchService.update(id, updateBranchDto);
  }

  // Delete a branch by ID
  @Roles('admin')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.branchService.remove(id);
  }
}
