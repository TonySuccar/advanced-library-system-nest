import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Branch, BranchDocument } from './schemas/branch.schema';
import { CreateBranchDto } from './dtos/create-branch.dto';
import { Borrow, BorrowDocument } from '../user/schemas/borrow.schema';
import {
  BranchInventory,
  BranchInventoryDocument,
} from '../cms/schemas/branchInventory.schema';

@Injectable()
export class BranchService {
  constructor(
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
    @InjectModel(Borrow.name)
    private readonly borrowModel: Model<BorrowDocument>,
    @InjectModel(BranchInventory.name)
    private readonly branchInventoryModel: Model<BranchInventoryDocument>,
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
    // Convert string ID to ObjectId
    const branchObjectId = new Types.ObjectId(id);

    // Step 1: Delete the branch itself
    const deletedBranch = await this.branchModel
      .findByIdAndDelete(branchObjectId)
      .exec();
    if (!deletedBranch) {
      throw new NotFoundException('Branch not found.');
    }

    // Step 2: Delete all branch inventory records related to the branch
    await this.branchInventoryModel
      .deleteMany({ branchId: branchObjectId })
      .exec();

    // Step 3: Delete all borrow records related to the branch
    await this.borrowModel.deleteMany({ branchId: branchObjectId }).exec();

    return { message: 'Branch and related records deleted successfully.' };
  }
}
