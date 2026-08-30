import { ApiProperty } from '@nestjs/swagger';
import { ServiceOrderStatus } from '../../../common/enums/service-order-status.enum';
import { ServiceOrder } from '../entities/service-order.entity';
import { OrderItemResponseDto } from './order-item-response.dto';
import { QuoteResponseDto } from '../../quotes/dto/quote-response.dto';

export class ServiceOrderResponseDto {
  @ApiProperty({ example: 'e5f60718-92a3-b4c5-d6e7-f80910213243' })
  id: string;

  @ApiProperty({ example: 'OS-000042' })
  number: string;

  @ApiProperty({ example: 'b3f1c2a4-5d6e-7f80-91a2-b3c4d5e6f708' })
  customerId: string;

  @ApiProperty({ example: 'c4a2d3b5-6e7f-8091-a2b3-c4d5e6f70819' })
  vehicleId: string;

  @ApiProperty({
    enum: ServiceOrderStatus,
    example: ServiceOrderStatus.RECEIVED,
  })
  status: ServiceOrderStatus;

  @ApiProperty({
    example: 'Cliente relata barulho na suspensão dianteira.',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example: { received: 900, in_diagnosis: 5400 },
    description: 'Segundos acumulados em cada status já concluído.',
  })
  statusDurations: Record<string, number>;

  @ApiProperty()
  statusChangedAt: Date;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: [OrderItemResponseDto] })
  services: OrderItemResponseDto[];

  @ApiProperty({ type: [OrderItemResponseDto] })
  parts: OrderItemResponseDto[];

  @ApiProperty({ type: [OrderItemResponseDto] })
  supplies: OrderItemResponseDto[];

  @ApiProperty({ type: QuoteResponseDto, nullable: true })
  quote: QuoteResponseDto | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(order: ServiceOrder): ServiceOrderResponseDto {
    const dto = new ServiceOrderResponseDto();
    dto.id = order.id;
    dto.number = order.number;
    dto.customerId = order.customerId;
    dto.vehicleId = order.vehicleId;
    dto.status = order.status;
    dto.description = order.description;
    dto.statusDurations = order.statusDurations ?? {};
    dto.statusChangedAt = order.statusChangedAt;
    dto.isActive = order.isActive;
    dto.services = (order.services ?? []).map(
      OrderItemResponseDto.fromServiceItem,
    );
    dto.parts = (order.parts ?? []).map(OrderItemResponseDto.fromPartItem);
    dto.supplies = (order.supplies ?? []).map(
      OrderItemResponseDto.fromSupplyItem,
    );
    dto.quote = order.quote ? QuoteResponseDto.fromEntity(order.quote) : null;
    dto.createdAt = order.createdAt;
    dto.updatedAt = order.updatedAt;
    return dto;
  }
}
