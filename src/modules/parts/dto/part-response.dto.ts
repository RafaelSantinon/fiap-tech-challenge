import { ApiProperty } from '@nestjs/swagger';
import { Part } from '../entities/part.entity';

export class PartResponseDto {
  @ApiProperty({ example: 'b3f1c2a4-5d6e-7f80-91a2-b3c4d5e6f708' })
  id: string;

  @ApiProperty({ example: 'FLTOIL-001' })
  code: string;

  @ApiProperty({ example: 'Filtro de óleo' })
  name: string;

  @ApiProperty({
    example: 'Filtro de óleo para motores 1.0 a 1.6.',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ example: 'Bosch', nullable: true })
  brand: string | null;

  @ApiProperty({ example: 49.9 })
  unitPrice: number;

  @ApiProperty({ example: 10 })
  stockQuantity: number;

  @ApiProperty({ example: 2 })
  minimumStock: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(part: Part): PartResponseDto {
    const dto = new PartResponseDto();
    dto.id = part.id;
    dto.code = part.code;
    dto.name = part.name;
    dto.description = part.description;
    dto.brand = part.brand;
    dto.unitPrice = part.unitPrice;
    dto.stockQuantity = part.stockQuantity;
    dto.minimumStock = part.minimumStock;
    dto.isActive = part.isActive;
    dto.createdAt = part.createdAt;
    dto.updatedAt = part.updatedAt;
    return dto;
  }
}
