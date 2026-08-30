import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateOrderItemDto {
  @ApiProperty({ example: 3, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
