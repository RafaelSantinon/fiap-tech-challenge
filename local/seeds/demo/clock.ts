import { DataSource } from 'typeorm';
import { ServiceOrderStatus } from '../../../src/common/enums/service-order-status.enum';

const SEED = 20260831;

const DAY = 86400;
const HOUR = 3600;
const MINUTE = 60;

const RANGES: Partial<Record<ServiceOrderStatus, [number, number]>> = {
  [ServiceOrderStatus.RECEIVED]: [5 * MINUTE, 30 * MINUTE],
  [ServiceOrderStatus.IN_DIAGNOSIS]: [30 * MINUTE, 4 * HOUR],
  [ServiceOrderStatus.AWAITING_APPROVAL]: [1 * HOUR, 3 * DAY],
  [ServiceOrderStatus.FINISHED]: [2 * HOUR, 4 * DAY],
};

export interface OrderTiming {
  createdAt: Date;
  statusChangedAt: Date;
  durations: Record<string, number>;
}

export function createRandom(seed = SEED): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildTiming(
  random: () => number,
  path: ServiceOrderStatus[],
  estimatedMinutes: number,
): OrderTiming {
  const durations: Record<string, number> = {};
  const left = path.slice(0, -1);

  for (const status of left) {
    durations[status] =
      status === ServiceOrderStatus.IN_PROGRESS
        ? executionSeconds(random, estimatedMinutes)
        : between(random, RANGES[status] ?? [HOUR, 2 * HOUR]);
  }

  const elapsed = Object.values(durations).reduce(
    (total, seconds) => total + seconds,
    0,
  );
  const enteredAt = Date.now() - between(random, [0, 55 * DAY]) * 1000;

  return {
    createdAt: new Date(enteredAt - elapsed * 1000),
    statusChangedAt: new Date(enteredAt),
    durations,
  };
}

export async function applyTiming(
  dataSource: DataSource,
  orderId: string,
  timing: OrderTiming,
): Promise<void> {
  await dataSource.query(
    `UPDATE "service_orders"
        SET "created_at" = $2,
            "updated_at" = $3,
            "status_changed_at" = $3,
            "status_durations" = $4
      WHERE "id" = $1`,
    [
      orderId,
      timing.createdAt,
      timing.statusChangedAt,
      JSON.stringify(timing.durations),
    ],
  );

  for (const table of [
    'service_order_services',
    'service_order_parts',
    'service_order_supplies',
  ]) {
    await dataSource.query(
      `UPDATE "${table}" SET "created_at" = $2, "updated_at" = $2
        WHERE "service_order_id" = $1`,
      [orderId, timing.createdAt],
    );
  }

  const quoteSentAt = new Date(
    timing.createdAt.getTime() +
      (timing.durations[ServiceOrderStatus.RECEIVED] ?? 0) * 1000 +
      (timing.durations[ServiceOrderStatus.IN_DIAGNOSIS] ?? 0) * 1000,
  );
  const waited = timing.durations[ServiceOrderStatus.AWAITING_APPROVAL];
  const respondedAt =
    waited === undefined
      ? null
      : new Date(quoteSentAt.getTime() + waited * 1000);

  await dataSource.query(
    `UPDATE "quotes"
        SET "created_at" = $2::timestamp,
            "sent_at" = $2::timestamp,
            "updated_at" = COALESCE($3::timestamp, $2::timestamp),
            "responded_at" = CASE
              WHEN "responded_at" IS NULL THEN NULL
              ELSE $3::timestamp
            END
      WHERE "service_order_id" = $1`,
    [orderId, quoteSentAt, respondedAt],
  );
}

function between(random: () => number, [min, max]: [number, number]): number {
  return Math.round(min + random() * (max - min));
}

function executionSeconds(
  random: () => number,
  estimatedMinutes: number,
): number {
  const jitter = 0.8 + random() * 0.6;
  return Math.round(Math.max(estimatedMinutes, 15) * MINUTE * jitter);
}
