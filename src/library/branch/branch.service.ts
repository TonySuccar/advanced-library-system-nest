import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Branch, BranchDocument } from './schemas/branch.schema';
import { CreateBranchDto } from './dtos/create-branch.dto';

@Injectable()
export class BranchService {
  constructor(
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
  ) {}

  // Create a new branch
  async create(createBranchDto: CreateBranchDto): Promise<Branch> {
    const existingBranch = await this.branchModel.findOne({
      branchName: createBranchDto.branchName,
    });

    if (existingBranch) {
      throw new BadRequestException('Branch with this name already exists.');
    }

    const branch = new this.branchModel(createBranchDto);
    return branch.save();
  }

  // Get all branches
  async findAll(): Promise<Branch[]> {
    return this.branchModel.find().exec();
  }

  // Get a branch by ID
  async findOne(id: string): Promise<Branch> {
    const branch = await this.branchModel.findById(id).exec();
    if (!branch) {
      throw new NotFoundException('Branch not found.');
    }
    return branch;
  }

  // Update a branch by ID
  async update(id: string, updateBranchDto: CreateBranchDto): Promise<Branch> {
    const updatedBranch = await this.branchModel
      .findByIdAndUpdate(id, updateBranchDto, { new: true })
      .exec();

    if (!updatedBranch) {
      throw new NotFoundException('Branch not found.');
    }

    return updatedBranch;
  }

  // Delete a branch by ID
  async remove(id: string): Promise<{ message: string }> {
    const deletedBranch = await this.branchModel.findByIdAndDelete(id).exec();
    if (!deletedBranch) {
      throw new NotFoundException('Branch not found.');
    }
    return { message: 'Branch deleted successfully.' };
  }
}
