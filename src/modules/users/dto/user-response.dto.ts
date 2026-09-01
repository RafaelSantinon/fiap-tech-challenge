import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user-role.enum';
import { User } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({ example: 'b3f1c2a4-5d6e-7f80-91a2-b3c4d5e6f708' })
  id: string;

  @ApiProperty({ example: 'João da Silva' })
  name: string;

  @ApiProperty({ example: 'joao@oficina.com' })
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.MECHANIC })
  role: UserRole;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.email = user.email;
    dto.role = user.role;
    dto.isActive = user.isActive;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
