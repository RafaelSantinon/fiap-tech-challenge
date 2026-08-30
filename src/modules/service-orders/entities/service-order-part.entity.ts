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
import { Part } from '../../parts/entities/part.entity';
import { ServiceOrder } from './service-order.entity';

@Entity({ name: 'service_order_parts' })
export class ServiceOrderPart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'service_order_id', type: 'uuid' })
  serviceOrderId: string;

  @ManyToOne(() => ServiceOrder, (order) => order.parts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder: ServiceOrder;

  @Index()
  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @ManyToOne(() => Part, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'part_id' })
  part: Part;

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
