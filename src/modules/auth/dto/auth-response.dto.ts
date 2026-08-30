import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user-role.enum';

export class AuthUserDto {
  @ApiProperty({ example: 'b3f1c2a4-5d6e-7f80-91a2-b3c4d5e6f708' })
  id: string;

  @ApiProperty({ example: 'admin@oficina.com' })
  email: string;

  @ApiProperty({ example: 'Administrador' })
  name: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  role: UserRole;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT de acesso (curta duração).' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token (longa duração).' })
  refreshToken: string;

  @ApiProperty({
    description: 'Segundos até a expiração do access token.',
    example: 600,
  })
  expiresIn: number;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
