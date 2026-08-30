import { ApiProperty } from '@nestjs/swagger';
import { Vehicle } from '../entities/vehicle.entity';

export class VehicleResponseDto {
  @ApiProperty({ example: 'c4e2d3b5-6f70-8912-a3b4-c5d6e7f80912' })
  id: string;

  @ApiProperty({ example: 'ABC1D23' })
  plate: string;

  @ApiProperty({ example: 'Volkswagen' })
  brand: string;

  @ApiProperty({ example: 'Gol' })
  model: string;

  @ApiProperty({ example: 2020 })
  year: number;

  @ApiProperty({ example: 'b3f1c2a4-5d6e-7f80-91a2-b3c4d5e6f708' })
  customerId: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(vehicle: Vehicle): VehicleResponseDto {
    const dto = new VehicleResponseDto();
    dto.id = vehicle.id;
    dto.plate = vehicle.plate;
    dto.brand = vehicle.brand;
    dto.model = vehicle.model;
    dto.year = vehicle.year;
    dto.customerId = vehicle.customerId;
    dto.isActive = vehicle.isActive;
    dto.createdAt = vehicle.createdAt;
    dto.updatedAt = vehicle.updatedAt;
    return dto;
  }
}
