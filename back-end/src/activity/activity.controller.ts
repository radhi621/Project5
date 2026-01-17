import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('activity')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('recent')
  getRecent(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.activityService.getRecent(limitNum);
  }

  @Get('stats')
  getStats() {
    return this.activityService.getStats();
  }

  @Get('by-type')
  getByType(@Query('type') type: string, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.activityService.getByType(type, limitNum);
  }
}
