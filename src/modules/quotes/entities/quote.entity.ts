import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QuoteStatus } from '../../../common/enums/quote-status.enum';
import { moneyTransformer } from '../../../common/utils/money.transformer';
import { ServiceOrder } from '../../service-orders/entities/service-order.entity';

@Entity({ name: 'quotes' })
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_order_id', type: 'uuid', unique: true })
  serviceOrderId: string;

  @OneToOne(() => ServiceOrder, (order) => order.quote, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder: ServiceOrder;

  @Column({ type: 'enum', enum: QuoteStatus, default: QuoteStatus.PENDING })
  status: QuoteStatus;

  @Column({
    name: 'services_total',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: moneyTransformer,
  })
  servicesTotal: number;

  @Column({
    name: 'parts_total',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: moneyTransformer,
  })
  partsTotal: number;

  @Column({
    name: 'supplies_total',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: moneyTransformer,
  })
  suppliesTotal: number;

  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: moneyTransformer,
  })
  totalAmount: number;

  @Column({ name: 'sent_at', type: 'timestamp' })
  sentAt: Date;

  @Column({ name: 'responded_at', type: 'timestamp', nullable: true })
  respondedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
