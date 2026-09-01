import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateServiceOrderDto {
  @ApiProperty({ example: 'b3f1c2a4-5d6e-7f80-91a2-b3c4d5e6f708' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ example: 'c4a2d3b5-6e7f-8091-a2b3-c4d5e6f70819' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({
    example: 'Cliente relata barulho na suspensão dianteira.',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
