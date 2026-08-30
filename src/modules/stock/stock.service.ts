import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PartsService } from '../parts/parts.service';
import { SuppliesService } from '../supplies/supplies.service';

export interface StockLine {
  id: string;
  quantity: number;
}

@Injectable()
export class StockService {
  constructor(
    private readonly partsService: PartsService,
    private readonly suppliesService: SuppliesService,
  ) {}

  async reserve(
    parts: StockLine[],
    supplies: StockLine[],
    manager: EntityManager,
  ): Promise<void> {
    for (const line of parts) {
      await this.partsService.reserve(line.id, line.quantity, manager);
    }
    for (const line of supplies) {
      await this.suppliesService.reserve(line.id, line.quantity, manager);
    }
  }

  async release(
    parts: StockLine[],
    supplies: StockLine[],
    manager: EntityManager,
  ): Promise<void> {
    for (const line of parts) {
      await this.partsService.release(line.id, line.quantity, manager);
    }
    for (const line of supplies) {
      await this.suppliesService.release(line.id, line.quantity, manager);
    }
  }

  async consume(
    parts: StockLine[],
    supplies: StockLine[],
    manager: EntityManager,
  ): Promise<void> {
    for (const line of parts) {
      await this.partsService.consume(line.id, line.quantity, manager);
    }
    for (const line of supplies) {
      await this.suppliesService.consume(line.id, line.quantity, manager);
    }
  }
}
