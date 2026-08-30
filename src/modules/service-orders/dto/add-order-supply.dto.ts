import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AddOrderSupplyDto {
  @ApiProperty({ example: 'f7d5061e-9102-b3c4-d5e6-f70819203142' })
  @IsUUID()
  supplyId: string;

  @ApiProperty({ example: 4, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
