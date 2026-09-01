import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServiceOrderStatus } from '../../../common/enums/service-order-status.enum';
import { Customer } from '../../customers/entities/customer.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { ServiceOrderService } from './service-order-service.entity';
import { ServiceOrderPart } from './service-order-part.entity';
import { ServiceOrderSupply } from './service-order-supply.entity';
import { Quote } from '../../quotes/entities/quote.entity';

@Entity({ name: 'service_orders' })
export class ServiceOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, insert: false, update: false })
  number: string;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Index()
  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Index()
  @Column({
    type: 'enum',
    enum: ServiceOrderStatus,
    default: ServiceOrderStatus.RECEIVED,
  })
  status: ServiceOrderStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'status_durations', type: 'jsonb', default: () => `'{}'` })
  statusDurations: Record<string, number>;

  @Column({ name: 'status_changed_at', type: 'timestamp' })
  statusChangedAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => ServiceOrderService, (item) => item.serviceOrder)
  services: ServiceOrderService[];

  @OneToMany(() => ServiceOrderPart, (item) => item.serviceOrder)
  parts: ServiceOrderPart[];

  @OneToMany(() => ServiceOrderSupply, (item) => item.serviceOrder)
  supplies: ServiceOrderSupply[];

  @OneToOne(() => Quote, (quote) => quote.serviceOrder)
  quote: Quote | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
