import { StockLine } from '../stock/stock.service';
import { ServiceOrder } from './entities/service-order.entity';

export function toPartLines(order: ServiceOrder): StockLine[] {
  return (order.parts ?? []).map((item) => ({
    id: item.partId,
    quantity: item.quantity,
  }));
}

export function toSupplyLines(order: ServiceOrder): StockLine[] {
  return (order.supplies ?? []).map((item) => ({
    id: item.supplyId,
    quantity: item.quantity,
  }));
}
