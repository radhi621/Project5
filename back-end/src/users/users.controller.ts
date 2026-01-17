import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('admin')
  findAll(@Query('status') status?: string) {
    return this.usersService.findAll(status);
  }

  @Get('stats')
  @Roles('admin')
  getStats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  @Roles('admin', 'user', 'mechanic')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'user', 'mechanic')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/last-active')
  @Roles('admin', 'user', 'mechanic')
  updateLastActive(@Param('id') id: string) {
    return this.usersService.updateLastActive(id);
  }

  @Patch(':id/suspend')
  @Roles('admin')
  suspend(@Param('id') id: string) {
    return this.usersService.suspend(id);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
