import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request, Patch, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ChangeRoleDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req: any) {
    return req.user.user;
  }

  @Patch('user/:id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  changeUserRole(@Param('id') id: string, @Body() changeRoleDto: ChangeRoleDto) {
    return this.authService.changeUserRole(id, changeRoleDto.role);
  }
}
