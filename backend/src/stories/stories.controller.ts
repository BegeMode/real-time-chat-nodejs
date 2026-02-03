import { AuthUser } from '@decorators/auth-user.decorator.js';
import { JwtAuthGuard } from '@guards/jwt-auth.guard.js';
import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IStory, IUserStories } from '@shared/story.js';
import { IUser } from '@shared/user.js';
import { StoriesService } from '@stories/stories.service.js';

@ApiTags('stories')
@ApiBearerAuth()
@Controller('stories')
@UseGuards(JwtAuthGuard)
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a new story' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Story uploaded successfully',
  })
  @UseInterceptors(FileInterceptor('video'))
  uploadStory(
    @UploadedFile() file: Express.Multer.File,
    @Body('duration') duration: string,
    @AuthUser('_id') userId: string,
  ): Promise<IStory<IUser>> {
    return this.storiesService.create(
      userId,
      file,
      Number.parseFloat(duration) || 15,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all stories grouped by user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all active stories grouped by user',
  })
  getStories(@AuthUser('_id') userId: string): Promise<IUserStories[]> {
    return this.storiesService.findAllGroupedByUser(userId);
  }
}
