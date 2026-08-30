import { ApiProperty } from '@nestjs/swagger';
import { ServiceOrderService } from '../entities/service-order-service.entity';
import { ServiceOrderPart } from '../entities/service-order-part.entity';
import { ServiceOrderSupply } from '../entities/service-order-supply.entity';

export class OrderItemResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-5e6f-7081-92a3-b4c5d6e7f809' })
  id: string;

  @ApiProperty({
    example: 'b2c3d4e5-6f70-8192-a3b4-c5d6e7f80910',
    description: 'Identificador do serviço, peça ou insumo no catálogo.',
  })
  referenceId: string;

  @ApiProperty({ example: 'Troca de óleo' })
  name: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 49.9 })
  unitPrice: number;

  @ApiProperty({ example: 99.8 })
  totalPrice: number;

  static fromServiceItem(item: ServiceOrderService): OrderItemResponseDto {
    return OrderItemResponseDto.build(
      item.id,
      item.serviceId,
      item.service?.name ?? '',
      item,
    );
  }

  static fromPartItem(item: ServiceOrderPart): OrderItemResponseDto {
    return OrderItemResponseDto.build(
      item.id,
      item.partId,
      item.part?.name ?? '',
      item,
    );
  }

  static fromSupplyItem(item: ServiceOrderSupply): OrderItemResponseDto {
    return OrderItemResponseDto.build(
      item.id,
      item.supplyId,
      item.supply?.name ?? '',
      item,
    );
  }

  private static build(
    id: string,
    referenceId: string,
    name: string,
    item: { quantity: number; unitPrice: number; totalPrice: number },
  ): OrderItemResponseDto {
    const dto = new OrderItemResponseDto();
    dto.id = id;
    dto.referenceId = referenceId;
    dto.name = name;
    dto.quantity = item.quantity;
    dto.unitPrice = item.unitPrice;
    dto.totalPrice = item.totalPrice;
    return dto;
  }
}
