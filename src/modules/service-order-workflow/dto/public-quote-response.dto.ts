import { ApiProperty } from '@nestjs/swagger';
import { QuoteStatus } from '../../../common/enums/quote-status.enum';
import { ServiceOrder } from '../../service-orders/entities/service-order.entity';
import { Quote } from '../../quotes/entities/quote.entity';
import { OrderItemResponseDto } from '../../service-orders/dto/order-item-response.dto';

export class PublicQuoteResponseDto {
  @ApiProperty({ example: 'OS-000042' })
  orderNumber: string;

  @ApiProperty({ example: 'ABC1D23' })
  vehiclePlate: string;

  @ApiProperty({ enum: QuoteStatus, example: QuoteStatus.PENDING })
  status: QuoteStatus;

  @ApiProperty({ type: [OrderItemResponseDto] })
  services: OrderItemResponseDto[];

  @ApiProperty({ type: [OrderItemResponseDto] })
  parts: OrderItemResponseDto[];

  @ApiProperty({ type: [OrderItemResponseDto] })
  supplies: OrderItemResponseDto[];

  @ApiProperty({ example: 260 })
  servicesTotal: number;

  @ApiProperty({ example: 99.8 })
  partsTotal: number;

  @ApiProperty({ example: 154 })
  suppliesTotal: number;

  @ApiProperty({ example: 513.8 })
  totalAmount: number;

  @ApiProperty()
  sentAt: Date;

  @ApiProperty({ nullable: true })
  respondedAt: Date | null;

  static fromEntities(
    order: ServiceOrder,
    quote: Quote,
  ): PublicQuoteResponseDto {
    const dto = new PublicQuoteResponseDto();
    dto.orderNumber = order.number;
    dto.vehiclePlate = order.vehicle?.plate ?? '';
    dto.status = quote.status;
    dto.services = (order.services ?? []).map(
      OrderItemResponseDto.fromServiceItem,
    );
    dto.parts = (order.parts ?? []).map(OrderItemResponseDto.fromPartItem);
    dto.supplies = (order.supplies ?? []).map(
      OrderItemResponseDto.fromSupplyItem,
    );
    dto.servicesTotal = quote.servicesTotal;
    dto.partsTotal = quote.partsTotal;
    dto.suppliesTotal = quote.suppliesTotal;
    dto.totalAmount = quote.totalAmount;
    dto.sentAt = quote.sentAt;
    dto.respondedAt = quote.respondedAt;
    return dto;
  }
}
