import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MechanicsService } from './mechanics.service';
import { CreateMechanicDto, UpdateMechanicDto } from './dto/mechanic.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('mechanics')
export class MechanicsController {
  constructor(private readonly mechanicsService: MechanicsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() createMechanicDto: CreateMechanicDto) {
    return this.mechanicsService.create(createMechanicDto);
  }

  @Get()
  findAll(@Query('availability') availability?: string) {
    return this.mechanicsService.findAll(availability);
  }

  @Get('stats')
  getStats() {
    return this.mechanicsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mechanicsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'mechanic')
  update(@Param('id') id: string, @Body() updateMechanicDto: UpdateMechanicDto, @Request() req: any) {
    // Mechanics can only update their own profile
    // This is handled in the service layer
    return this.mechanicsService.update(id, updateMechanicDto, req.user);
  }

  @Patch(':id/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'mechanic')
  updateAvailability(
    @Param('id') id: string,
    @Body('availability') availability: string,
    @Request() req: any,
  ) {
    return this.mechanicsService.updateAvailability(id, availability, req.user);
  }

  @Post(':id/review')
  addReview(@Param('id') id: string, @Body('rating') rating: number) {
    return this.mechanicsService.addReview(id, rating);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.mechanicsService.remove(id);
  }
}
