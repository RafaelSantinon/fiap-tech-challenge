import { ApiProperty } from '@nestjs/swagger';
import { ServiceOrderStatus } from '../../../common/enums/service-order-status.enum';

export class OrderStatusResponseDto {
  @ApiProperty({ example: 'OS-000042' })
  number: string;

  @ApiProperty({
    enum: ServiceOrderStatus,
    example: ServiceOrderStatus.IN_PROGRESS,
  })
  status: ServiceOrderStatus;
}
