import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { QuoteStatus } from '../../common/enums/quote-status.enum';
import { ServiceOrderStatus } from '../../common/enums/service-order-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { QuotesService } from '../quotes/quotes.service';
import { Quote } from '../quotes/entities/quote.entity';
import { StockService } from '../stock/stock.service';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { ServiceOrderItemsService } from '../service-orders/service-order-items.service';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import {
  toPartLines,
  toSupplyLines,
} from '../service-orders/service-order-stock.util';
import { AddOrderServiceDto } from '../service-orders/dto/add-order-service.dto';
import { AddOrderPartDto } from '../service-orders/dto/add-order-part.dto';
import { AddOrderSupplyDto } from '../service-orders/dto/add-order-supply.dto';
import { UpdateOrderItemDto } from '../service-orders/dto/update-order-item.dto';

@Injectable()
export class ServiceOrderWorkflowService {
  constructor(
    private readonly serviceOrdersService: ServiceOrdersService,
    private readonly itemsService: ServiceOrderItemsService,
    private readonly quotesService: QuotesService,
    private readonly stockService: StockService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  addService(orderId: string, dto: AddOrderServiceDto): Promise<ServiceOrder> {
    return this.addItem(orderId, (manager) =>
      this.itemsService.addService(orderId, dto, manager),
    );
  }

  addPart(orderId: string, dto: AddOrderPartDto): Promise<ServiceOrder> {
    return this.addItem(orderId, (manager) =>
      this.itemsService.addPart(orderId, dto, manager),
    );
  }

  addSupply(orderId: string, dto: AddOrderSupplyDto): Promise<ServiceOrder> {
    return this.addItem(orderId, (manager) =>
      this.itemsService.addSupply(orderId, dto, manager),
    );
  }

  async updateService(
    orderId: string,
    itemId: string,
    dto: UpdateOrderItemDto,
  ): Promise<ServiceOrder> {
    await this.itemsService.updateService(orderId, itemId, dto);
    return this.serviceOrdersService.findOne(orderId);
  }

  async updatePart(
    orderId: string,
    itemId: string,
    dto: UpdateOrderItemDto,
  ): Promise<ServiceOrder> {
    await this.itemsService.updatePart(orderId, itemId, dto);
    return this.serviceOrdersService.findOne(orderId);
  }

  async updateSupply(
    orderId: string,
    itemId: string,
    dto: UpdateOrderItemDto,
  ): Promise<ServiceOrder> {
    await this.itemsService.updateSupply(orderId, itemId, dto);
    return this.serviceOrdersService.findOne(orderId);
  }

  removeService(orderId: string, itemId: string): Promise<void> {
    return this.itemsService.removeService(orderId, itemId);
  }

  removePart(orderId: string, itemId: string): Promise<void> {
    return this.itemsService.removePart(orderId, itemId);
  }

  removeSupply(orderId: string, itemId: string): Promise<void> {
    return this.itemsService.removeSupply(orderId, itemId);
  }

  async findQuoteByNumber(
    number: string,
  ): Promise<{ order: ServiceOrder; quote: Quote }> {
    const order = await this.serviceOrdersService.findByNumber(number);
    const quote = await this.quotesService.findByServiceOrder(order.id);
    return { order, quote };
  }

  approve(number: string): Promise<{ order: ServiceOrder; quote: Quote }> {
    return this.respond(number, true);
  }

  reject(number: string): Promise<{ order: ServiceOrder; quote: Quote }> {
    return this.respond(number, false);
  }

  private async addItem(
    orderId: string,
    save: (manager: EntityManager) => Promise<unknown>,
  ): Promise<ServiceOrder> {
    await this.dataSource.transaction(async (manager) => {
      await save(manager);
      await this.generateQuoteIfComplete(orderId, manager);
    });
    return this.serviceOrdersService.findOne(orderId);
  }

  private async generateQuoteIfComplete(
    orderId: string,
    manager: EntityManager,
  ): Promise<void> {
    const order = await this.serviceOrdersService.findOne(orderId, manager);
    if (order.quote) {
      return;
    }
    if (
      !order.services?.length ||
      !order.parts?.length ||
      !order.supplies?.length
    ) {
      return;
    }

    await this.stockService.reserve(
      toPartLines(order),
      toSupplyLines(order),
      manager,
    );

    const quote = await this.quotesService.create(
      {
        serviceOrderId: order.id,
        servicesTotal: this.sum(order.services),
        partsTotal: this.sum(order.parts),
        suppliesTotal: this.sum(order.supplies),
      },
      manager,
    );

    await this.serviceOrdersService.changeStatus(
      order,
      ServiceOrderStatus.AWAITING_APPROVAL,
      manager,
    );

    this.notificationsService.sendQuote({
      orderNumber: order.number,
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      totalAmount: quote.totalAmount,
    });
  }

  private async respond(
    number: string,
    approved: boolean,
  ): Promise<{ order: ServiceOrder; quote: Quote }> {
    await this.dataSource.transaction(async (manager) => {
      const order = await this.serviceOrdersService.findByNumber(
        number,
        manager,
      );
      const quote = order.quote;

      if (
        quote?.status !== QuoteStatus.PENDING ||
        order.status !== ServiceOrderStatus.AWAITING_APPROVAL
      ) {
        throw new ConflictException(
          'Este orçamento não está aguardando aprovação.',
        );
      }

      const parts = toPartLines(order);
      const supplies = toSupplyLines(order);

      if (approved) {
        await this.stockService.consume(parts, supplies, manager);
        await this.quotesService.markApproved(quote, manager);
      } else {
        await this.stockService.release(parts, supplies, manager);
        await this.quotesService.markRejected(quote, manager);
      }

      await this.serviceOrdersService.changeStatus(
        order,
        approved ? ServiceOrderStatus.IN_PROGRESS : ServiceOrderStatus.FINISHED,
        manager,
      );
    });

    return this.findQuoteByNumber(number);
  }

  private sum(items: { totalPrice: number }[]): number {
    return (
      Math.round(
        items.reduce((total, item) => total + item.totalPrice, 0) * 100,
      ) / 100
    );
  }
}
