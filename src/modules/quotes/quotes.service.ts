import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { QuoteStatus } from '../../common/enums/quote-status.enum';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { Quote } from './entities/quote.entity';

export interface QuoteTotals {
  serviceOrderId: string;
  servicesTotal: number;
  partsTotal: number;
  suppliesTotal: number;
}

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private readonly quotesRepository: Repository<Quote>,
  ) {}

  create(totals: QuoteTotals, manager: EntityManager): Promise<Quote> {
    const quote = manager.create(Quote, {
      serviceOrder: { id: totals.serviceOrderId } as ServiceOrder,
      serviceOrderId: totals.serviceOrderId,
      status: QuoteStatus.PENDING,
      servicesTotal: totals.servicesTotal,
      partsTotal: totals.partsTotal,
      suppliesTotal: totals.suppliesTotal,
      totalAmount: this.round(
        totals.servicesTotal + totals.partsTotal + totals.suppliesTotal,
      ),
      sentAt: new Date(),
      respondedAt: null,
    });
    return manager.save(Quote, quote);
  }

  findAll(status?: QuoteStatus, serviceOrderId?: string): Promise<Quote[]> {
    const where: FindOptionsWhere<Quote> = {};
    if (status) where.status = status;
    if (serviceOrderId) where.serviceOrderId = serviceOrderId;

    return this.quotesRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Quote> {
    const quote = await this.quotesRepository.findOne({ where: { id } });
    if (!quote) {
      throw new NotFoundException('Orçamento não encontrado.');
    }
    return quote;
  }

  async findByServiceOrder(serviceOrderId: string): Promise<Quote> {
    const quote = await this.quotesRepository.findOne({
      where: { serviceOrderId },
    });
    if (!quote) {
      throw new NotFoundException(
        'Esta ordem de serviço ainda não tem orçamento.',
      );
    }
    return quote;
  }

  markApproved(quote: Quote, manager: EntityManager): Promise<Quote> {
    return this.respond(quote, QuoteStatus.APPROVED, manager);
  }

  markRejected(quote: Quote, manager: EntityManager): Promise<Quote> {
    return this.respond(quote, QuoteStatus.REJECTED, manager);
  }

  private respond(
    quote: Quote,
    status: QuoteStatus,
    manager: EntityManager,
  ): Promise<Quote> {
    quote.status = status;
    quote.respondedAt = new Date();
    return manager.save(Quote, quote);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
