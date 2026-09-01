import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { moneyTransformer } from '../../../common/utils/money.transformer';
import { Supply } from '../../supplies/entities/supply.entity';
import { ServiceOrder } from './service-order.entity';

@Entity({ name: 'service_order_supplies' })
export class ServiceOrderSupply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'service_order_id', type: 'uuid' })
  serviceOrderId: string;

  @ManyToOne(() => ServiceOrder, (order) => order.supplies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder: ServiceOrder;

  @Index()
  @Column({ name: 'supply_id', type: 'uuid' })
  supplyId: string;

  @ManyToOne(() => Supply, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supply_id' })
  supply: Supply;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: moneyTransformer,
  })
  unitPrice: number;

  @Column({
    name: 'total_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: moneyTransformer,
  })
  totalPrice: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
