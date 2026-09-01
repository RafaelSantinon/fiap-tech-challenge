import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsPlate } from '../../../common/decorators/is-plate.decorator';

const OLDEST_YEAR = 1900;
const NEWEST_YEAR = new Date().getFullYear() + 1;

export class CreateVehicleDto {
  @ApiProperty({
    example: 'ABC1D23',
    description: 'Placa no padrão antigo (ABC1234) ou Mercosul (ABC1D23).',
  })
  @IsPlate()
  plate: string;

  @ApiProperty({ example: 'Volkswagen', maxLength: 60 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  brand: string;

  @ApiProperty({ example: 'Gol', maxLength: 60 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  model: string;

  @ApiProperty({ example: 2020, minimum: OLDEST_YEAR, maximum: NEWEST_YEAR })
  @IsInt()
  @Min(OLDEST_YEAR)
  @Max(NEWEST_YEAR)
  year: number;

  @ApiProperty({ example: 'b3f1c2a4-5d6e-7f80-91a2-b3c4d5e6f708' })
  @IsUUID()
  customerId: string;
}
