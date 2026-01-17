import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { ActivityService } from '../activity/activity.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private activityService: ActivityService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new UnauthorizedException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // Log activity
    await this.activityService.log(
      'user',
      'New user registered',
      (user as any)._id.toString(),
      user.name,
      { email: user.email, role: user.role },
    );

    // Generate tokens
    const tokens = await this.generateTokens((user as any)._id.toString(), user.email);

    return {
      user: {
        id: (user as any)._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    // Find user by email
    const user = await this.usersService.findByEmail(loginDto.email);
     console.log('user')
     console.log(user)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last active
    await this.usersService.updateLastActive((user as any)._id.toString());

    // Generate tokens
    const tokens = await this.generateTokens((user as any)._id.toString(), user.email);

    return {
      user: {
        id: (user as any)._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      ...tokens,
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findOne(userId);
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
    };
  }

  async changeUserRole(userId: string, role: string) {
    const user = await this.usersService.update(userId, { role });
    return {
      id: (user as any)._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
