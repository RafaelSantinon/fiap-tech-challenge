import { ApiProperty } from '@nestjs/swagger';
import { QuoteStatus } from '../../../common/enums/quote-status.enum';
import { Quote } from '../entities/quote.entity';

export class QuoteResponseDto {
  @ApiProperty({ example: 'c3d4e5f6-7081-92a3-b4c5-d6e7f8091021' })
  id: string;

  @ApiProperty({ example: 'd4e5f607-8192-a3b4-c5d6-e7f809102132' })
  serviceOrderId: string;

  @ApiProperty({ enum: QuoteStatus, example: QuoteStatus.PENDING })
  status: QuoteStatus;

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

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(quote: Quote): QuoteResponseDto {
    const dto = new QuoteResponseDto();
    dto.id = quote.id;
    dto.serviceOrderId = quote.serviceOrderId;
    dto.status = quote.status;
    dto.servicesTotal = quote.servicesTotal;
    dto.partsTotal = quote.partsTotal;
    dto.suppliesTotal = quote.suppliesTotal;
    dto.totalAmount = quote.totalAmount;
    dto.sentAt = quote.sentAt;
    dto.respondedAt = quote.respondedAt;
    dto.createdAt = quote.createdAt;
    dto.updatedAt = quote.updatedAt;
    return dto;
  }
}
