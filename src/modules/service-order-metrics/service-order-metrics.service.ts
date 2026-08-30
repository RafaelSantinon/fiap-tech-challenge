import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ServiceOrderStatus } from '../../common/enums/service-order-status.enum';

interface StatusAverageRow {
  status: ServiceOrderStatus;
  average_seconds: string;
  orders: string;
}

interface ServiceExecutionAverageRow {
  service_id: string;
  service_name: string;
  average_seconds: string;
  orders: string;
}

export interface StatusAverage {
  status: ServiceOrderStatus;
  averageSeconds: number;
  orders: number;
}

export interface ServiceExecutionAverage {
  serviceId: string;
  serviceName: string;
  averageSeconds: number;
  orders: number;
}

@Injectable()
export class ServiceOrderMetricsService {
  constructor(private readonly dataSource: DataSource) {}

  async averageTimePerStatus(): Promise<StatusAverage[]> {
    const rows = await this.dataSource.query<StatusAverageRow[]>(`
      SELECT duration.key AS status,
             AVG(duration.value::numeric) AS average_seconds,
             COUNT(*) AS orders
      FROM "service_orders" o,
           jsonb_each_text(o."status_durations") AS duration
      GROUP BY duration.key
      ORDER BY duration.key
    `);

    return rows.map((row) => ({
      status: row.status,
      averageSeconds: this.round(row.average_seconds),
      orders: Number(row.orders),
    }));
  }

  async averageExecutionTimePerService(): Promise<ServiceExecutionAverage[]> {
    const rows = await this.dataSource.query<ServiceExecutionAverageRow[]>(`
      SELECT s."id" AS service_id,
             s."name" AS service_name,
             AVG((o."status_durations" ->> 'in_progress')::numeric) AS average_seconds,
             COUNT(DISTINCT o."id") AS orders
      FROM "services" s
      JOIN "service_order_services" sos ON sos."service_id" = s."id"
      JOIN "service_orders" o ON o."id" = sos."service_order_id"
      WHERE o."status_durations" ->> 'in_progress' IS NOT NULL
      GROUP BY s."id", s."name"
      ORDER BY s."name"
    `);

    return rows.map((row) => ({
      serviceId: row.service_id,
      serviceName: row.service_name,
      averageSeconds: this.round(row.average_seconds),
      orders: Number(row.orders),
    }));
  }

  private round(value: string): number {
    return Math.round(Number(value));
  }
}
