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
import { IUserStories } from '@shared/story.js';
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
    // Swagger has bug with models which has referenced models (Story -> User)
    // so we return unknown
  ): Promise<unknown> {
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
  getStories(): Promise<IUserStories[]> {
    return this.storiesService.findAllGroupedByUser();
  }
}
