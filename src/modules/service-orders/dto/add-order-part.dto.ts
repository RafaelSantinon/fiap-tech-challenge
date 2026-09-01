import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AddOrderPartDto {
  @ApiProperty({ example: 'e6c4f5d7-8091-a2b3-c4d5-e6f708192031' })
  @IsUUID()
  partId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
