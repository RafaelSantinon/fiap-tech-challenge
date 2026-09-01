import { ApiProperty } from '@nestjs/swagger';
import { Service } from '../entities/service.entity';

export class ServiceResponseDto {
  @ApiProperty({ example: 'b3f1c2a4-5d6e-7f80-91a2-b3c4d5e6f708' })
  id: string;

  @ApiProperty({ example: 'Troca de óleo' })
  name: string;

  @ApiProperty({
    example: 'Substituição do óleo do motor e do filtro.',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ example: 189.9 })
  price: number;

  @ApiProperty({ example: 60 })
  estimatedMinutes: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(service: Service): ServiceResponseDto {
    const dto = new ServiceResponseDto();
    dto.id = service.id;
    dto.name = service.name;
    dto.description = service.description;
    dto.price = service.price;
    dto.estimatedMinutes = service.estimatedMinutes;
    dto.isActive = service.isActive;
    dto.createdAt = service.createdAt;
    dto.updatedAt = service.updatedAt;
    return dto;
  }
}
