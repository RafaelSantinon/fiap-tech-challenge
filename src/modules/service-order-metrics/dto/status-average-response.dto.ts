import { ApiProperty } from '@nestjs/swagger';
import { ServiceOrderStatus } from '../../../common/enums/service-order-status.enum';

export class StatusAverageResponseDto {
  @ApiProperty({
    enum: ServiceOrderStatus,
    example: ServiceOrderStatus.AWAITING_APPROVAL,
  })
  status: ServiceOrderStatus;

  @ApiProperty({ example: 5400, description: 'Tempo médio em segundos.' })
  averageSeconds: number;

  @ApiProperty({
    example: 12,
    description: 'Ordens que já passaram pelo status.',
  })
  orders: number;
}
