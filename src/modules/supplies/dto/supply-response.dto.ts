import { ApiProperty } from '@nestjs/swagger';
import { MeasurementUnit } from '../../../common/enums/measurement-unit.enum';
import { Supply } from '../entities/supply.entity';

export class SupplyResponseDto {
  @ApiProperty({ example: 'b3f1c2a4-5d6e-7f80-91a2-b3c4d5e6f708' })
  id: string;

  @ApiProperty({ example: 'OLEO-5W30' })
  code: string;

  @ApiProperty({ example: 'Óleo sintético 5W30' })
  name: string;

  @ApiProperty({
    example: 'Óleo lubrificante sintético para motores a gasolina.',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ enum: MeasurementUnit, example: MeasurementUnit.L })
  unit: MeasurementUnit;

  @ApiProperty({ example: 38.5 })
  unitPrice: number;

  @ApiProperty({ example: 40 })
  stockQuantity: number;

  @ApiProperty({ example: 12 })
  reservedQuantity: number;

  @ApiProperty({
    example: 28,
    description: 'Estoque livre para novas ordens de serviço.',
  })
  availableQuantity: number;

  @ApiProperty({ example: 10 })
  minimumStock: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(supply: Supply): SupplyResponseDto {
    const dto = new SupplyResponseDto();
    dto.id = supply.id;
    dto.code = supply.code;
    dto.name = supply.name;
    dto.description = supply.description;
    dto.unit = supply.unit;
    dto.unitPrice = supply.unitPrice;
    dto.stockQuantity = supply.stockQuantity;
    dto.reservedQuantity = supply.reservedQuantity;
    dto.availableQuantity = supply.stockQuantity - supply.reservedQuantity;
    dto.minimumStock = supply.minimumStock;
    dto.isActive = supply.isActive;
    dto.createdAt = supply.createdAt;
    dto.updatedAt = supply.updatedAt;
    return dto;
  }
}
