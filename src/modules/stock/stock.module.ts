import { Module } from '@nestjs/common';
import { PartsModule } from '../parts/parts.module';
import { SuppliesModule } from '../supplies/supplies.module';
import { StockService } from './stock.service';

@Module({
  imports: [PartsModule, SuppliesModule],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
