import { Controller, Get, UseGuards } from '@nestjs/common';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('health')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth() {
    return this.healthService.getSystemHealth();
  }

  @Get('response-time')
  getResponseTime() {
    return this.healthService.getResponseTimeMetrics();
  }

  @Get('storage')
  getStorage() {
    return this.healthService.getStorageMetrics();
  }
}
