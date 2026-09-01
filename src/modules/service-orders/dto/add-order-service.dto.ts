import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AddOrderServiceDto {
  @ApiProperty({ example: 'd5b3e4c6-7f80-9102-b3c4-d5e6f7081920' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
