import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { Branch, BranchSchema } from './schemas/branch.schema';
import { Borrow, BorrowSchema } from '../user/schemas/borrow.schema';
import {
  BranchInventory,
  BranchInventorySchema,
} from '../cms/schemas/branchInventory.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Branch.name, schema: BranchSchema }]),
    MongooseModule.forFeature([{ name: Borrow.name, schema: BorrowSchema }]),
    MongooseModule.forFeature([
      { name: BranchInventory.name, schema: BranchInventorySchema },
    ]),
  ],
  controllers: [BranchController],
  providers: [BranchService],
  exports: [BranchService],
})
export class BranchModule {}
