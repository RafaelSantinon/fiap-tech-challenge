import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateServiceDto } from './create-service.dto';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
