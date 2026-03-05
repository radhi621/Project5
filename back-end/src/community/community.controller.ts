import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import {
  CreatePostDto,
  UpdatePostDto,
  CreateCommentDto,
  VoteDto,
} from './dto/community.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // ── Posts ─────────────────────────────────────────────────────────────────

  @Post('posts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'mechanic')
  createPost(@Body() dto: CreatePostDto, @Request() req: any) {
    return this.communityService.createPost(
      dto,
      req.user.userId,
      req.user.user.name,
    );
  }

  // Public — no auth required to read posts
  @Get('posts')
  findAllPosts(
    @Query('sort') sort?: string,
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.findAllPosts(
      sort,
      tag,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('posts/:id')
  findOnePost(@Param('id') id: string) {
    return this.communityService.findOnePost(id);
  }

  @Patch('posts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'mechanic')
  updatePost(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @Request() req: any,
  ) {
    return this.communityService.updatePost(id, dto, req.user.userId, req.user.role);
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'mechanic')
  deletePost(@Param('id') id: string, @Request() req: any) {
    return this.communityService.deletePost(id, req.user.userId, req.user.role);
  }

  @Post('posts/:id/vote')
  @UseGuards(JwtAuthGuard)
  votePost(
    @Param('id') id: string,
    @Body() dto: VoteDto,
    @Request() req: any,
  ) {
    return this.communityService.votePost(id, dto.type, req.user.userId);
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  @Post('comments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'mechanic')
  createComment(@Body() dto: CreateCommentDto, @Request() req: any) {
    return this.communityService.createComment(
      dto,
      req.user.userId,
      req.user.user.name,
    );
  }

  // Public — no auth required to read comments
  @Get('comments/:postId')
  findComments(@Param('postId') postId: string) {
    return this.communityService.findCommentsByPost(postId);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'mechanic')
  deleteComment(@Param('id') id: string, @Request() req: any) {
    return this.communityService.deleteComment(id, req.user.userId, req.user.role);
  }

  @Post('comments/:id/vote')
  @UseGuards(JwtAuthGuard)
  voteComment(
    @Param('id') id: string,
    @Body() dto: VoteDto,
    @Request() req: any,
  ) {
    return this.communityService.voteComment(id, dto.type, req.user.userId);
  }
}
