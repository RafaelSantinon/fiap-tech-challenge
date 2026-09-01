import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePartDto {
  @ApiProperty({
    example: 'FLTOIL-001',
    maxLength: 30,
    description: 'Código da peça. É gravado sem espaços e em maiúsculas.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code: string;

  @ApiProperty({ example: 'Filtro de óleo', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({
    example: 'Filtro de óleo para motores 1.0 a 1.6.',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ example: 'Bosch', maxLength: 60, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  brand?: string;

  @ApiProperty({ example: 49.9, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 10, minimum: 0, required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @ApiProperty({
    example: 2,
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
