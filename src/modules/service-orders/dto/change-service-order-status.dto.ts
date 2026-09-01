import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ServiceOrderStatus } from '../../../common/enums/service-order-status.enum';

export class ChangeServiceOrderStatusDto {
  @ApiProperty({
    enum: ServiceOrderStatus,
    example: ServiceOrderStatus.IN_DIAGNOSIS,
    description:
      'Transições manuais permitidas: received para in_diagnosis, ' +
      'in_progress para finished e finished para delivered.',
  })
  @IsEnum(ServiceOrderStatus)
  status: ServiceOrderStatus;
}
