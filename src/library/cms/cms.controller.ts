// src/cms/cms.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
  Query,
  Patch,
  Param,
} from '@nestjs/common';
import { CMSService } from './cms.service';
import { CreateCMSUserDto } from './dtos/create-CMS.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreateAuthorDto } from './dtos/create-author.dto';
import { FileUploadInterceptor } from 'src/common/file-upload.interceptor';
import { changeAuthorpassDto } from './dtos/change-password.dto';
import { DistributeBooksDto } from './dtos/distribute-books.dto';

@Controller('cms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CMSController {
  constructor(private readonly cmsService: CMSService) {}

  @Post('create')
  @Roles('admin')
  async createCMSUser(@Body() createCMSUserDto: CreateCMSUserDto) {
    return this.cmsService.createCMSUser(
      createCMSUserDto.email,
      createCMSUserDto.password,
      createCMSUserDto.role,
      createCMSUserDto.name,
    );
  }
  @Post('create-author')
  @Roles('admin') // Only admins can create authors
  @UseInterceptors(
    FileUploadInterceptor.uploadFile(
      'profileImage', // The field name in the form-data
      /\/(jpg|jpeg|png)$/, // Allowed file types
      './uploads/profile-images', // Destination folder for the uploaded file
    ),
  )
  async createAuthor(
    @Body() createAuthorDto: CreateAuthorDto,
    @UploadedFile() profileImage: Express.Multer.File, // Handle the uploaded file
  ) {
    if (!profileImage) {
      throw new BadRequestException('Profile image is required.');
    }

    const profileImageUrl = `/uploads/profile-images/${profileImage.filename}`;
    return this.cmsService.createAuthor(createAuthorDto, profileImageUrl);
  }

  @Post('change-author-password')
  @Roles('admin')
  async changeAuthorPass(@Body() changepassDto: changeAuthorpassDto) {
    return this.cmsService.changeAuthorPass(changepassDto);
  }

  @Get('book-requests')
  async getAllRequests(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.cmsService.getAllRequests({ page, limit });
  }

  @Patch('requests/:id/accept')
  @Roles('admin')
  async acceptBookRequest(@Param('id') requestId: string) {
    return this.cmsService.acceptBookRequest(requestId);
  }
  @Patch('requests/:id/reject')
  @Roles('admin')
  async rejectBookRequestById(@Param('id') requestId: string) {
    return this.cmsService.rejectBookRequestById(requestId);
  }

  @Post('distribute-books')
  @Roles('admin')
  async distributeBooks(@Body() distributeBooksDto: DistributeBooksDto) {
    return this.cmsService.distributeBooks(distributeBooksDto);
  }
}
