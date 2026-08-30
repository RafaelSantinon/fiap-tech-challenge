import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { MeasurementUnit } from '../../../common/enums/measurement-unit.enum';

export class CreateSupplyDto {
  @ApiProperty({
    example: 'OLEO-5W30',
    maxLength: 30,
    description: 'Código do insumo. É gravado sem espaços e em maiúsculas.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code: string;

  @ApiProperty({ example: 'Óleo sintético 5W30', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({
    example: 'Óleo lubrificante sintético para motores a gasolina.',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ enum: MeasurementUnit, example: MeasurementUnit.L })
  @IsEnum(MeasurementUnit)
  unit: MeasurementUnit;

  @ApiProperty({ example: 38.5, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 40, minimum: 0, required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @ApiProperty({
    example: 10,
    minimum: 0,
    required: false,
    default: 0,
    description: 'Quantidade mínima desejada em estoque.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumStock?: number;
}
