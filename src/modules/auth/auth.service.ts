import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { UserToken } from './entities/user-token.entity';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { durationToSeconds } from '../../common/utils/duration.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserToken)
    private readonly userTokenRepository: Repository<UserToken>,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.userTokenRepository.findOne({
      where: { refreshTokenHash: tokenHash },
      relations: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    if (!stored.user || !stored.user.isActive) {
      throw new UnauthorizedException('Usuário inválido ou inativo.');
    }

    stored.revoked = true;
    await this.userTokenRepository.save(stored);

    return this.buildAuthResponse(stored.user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.userTokenRepository.findOne({
      where: { refreshTokenHash: tokenHash },
    });
    if (stored && !stored.revoked) {
      stored.revoked = true;
      await this.userTokenRepository.save(stored);
    }
  }

  private async buildAuthResponse(user: User): Promise<AuthResponseDto> {
    const accessExpires = this.configService.get<string>(
      'jwt.accessExpires',
      '10m',
    );
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: accessExpires,
    } as Record<string, unknown>);

    const refreshToken = await this.issueRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      expiresIn: durationToSeconds(accessExpires),
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  private async issueRefreshToken(user: User): Promise<string> {
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshExpires = this.configService.get<string>(
      'jwt.refreshExpires',
      '7d',
    );
    const expiresAt = new Date(
      Date.now() + durationToSeconds(refreshExpires) * 1000,
    );

    const entity = this.userTokenRepository.create({
      userId: user.id,
      refreshTokenHash: this.hashToken(refreshToken),
      expiresAt,
      revoked: false,
    });
    await this.userTokenRepository.save(entity);

    return refreshToken;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
