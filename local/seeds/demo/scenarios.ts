import { ServiceOrderStatus } from '../../../src/common/enums/service-order-status.enum';
import { VEHICLES } from './data';

export type OrderOutcome =
  | 'received'
  | 'in_diagnosis'
  | 'awaiting_approval'
  | 'in_progress'
  | 'rejected'
  | 'executed'
  | 'delivered';

export interface OrderLine {
  key: string;
  quantity: number;
}

export interface OrderPlan {
  vehicleKey: string;
  description: string;
  services: OrderLine[];
  parts: OrderLine[];
  supplies: OrderLine[];
  outcome: OrderOutcome;
  deactivate: boolean;
}

const RECIPES: Record<string, { parts: string[]; supplies: string[] }> = {
  oleo: { parts: ['filtro-oleo'], supplies: ['oleo-5w30'] },
  alinhamento: { parts: ['bucha'], supplies: ['graxa'] },
  freios: { parts: ['pastilha', 'disco'], supplies: ['fluido-freio'] },
  suspensao: { parts: ['amortecedor', 'bucha'], supplies: ['graxa'] },
  revisao: {
    parts: ['filtro-oleo', 'filtro-ar', 'vela'],
    supplies: ['oleo-5w30', 'aditivo'],
  },
  correia: { parts: ['correia', 'tensor'], supplies: ['desengraxante'] },
  arcondicionado: { parts: ['filtro-cabine'], supplies: ['desengraxante'] },
  bateria: { parts: ['bateria'], supplies: ['estopa'] },
  embreagem: { parts: ['embreagem'], supplies: ['graxa'] },
};

const SUPPLY_QUANTITY: Record<string, [number, number]> = {
  'oleo-5w30': [3, 5],
  'oleo-15w40': [3, 6],
  'fluido-freio': [500, 1000],
  aditivo: [1, 2],
  graxa: [1, 2],
  desengraxante: [200, 400],
  estopa: [1, 3],
};

const COMPLAINTS = [
  'Cliente relata barulho na suspensão dianteira.',
  'Revisão preventiva de 30 mil quilômetros.',
  'Freio com ruído ao frear em baixa velocidade.',
  'Luz de óleo acesa no painel.',
  'Ar-condicionado com cheiro forte ao ligar.',
  'Carro não pegou pela manhã, suspeita de bateria.',
  'Trepidação no volante acima de 80 km/h.',
  'Cliente pediu orçamento antes da viagem de férias.',
  'Correia com assobio ao dar partida.',
  'Embreagem patinando na subida.',
  'Manutenção programada da frota.',
  'Troca de óleo e filtros de rotina.',
];

const DISTRIBUTION: Array<{ outcome: OrderOutcome; count: number }> = [
  { outcome: 'received', count: 4 },
  { outcome: 'in_diagnosis', count: 5 },
  { outcome: 'awaiting_approval', count: 8 },
  { outcome: 'in_progress', count: 8 },
  { outcome: 'rejected', count: 5 },
  { outcome: 'executed', count: 6 },
  { outcome: 'delivered', count: 8 },
];

const DEACTIVATED_AT = [12, 29];

export const STATUS_PATHS: Record<OrderOutcome, ServiceOrderStatus[]> = {
  received: [ServiceOrderStatus.RECEIVED],
  in_diagnosis: [ServiceOrderStatus.RECEIVED, ServiceOrderStatus.IN_DIAGNOSIS],
  awaiting_approval: [
    ServiceOrderStatus.RECEIVED,
    ServiceOrderStatus.IN_DIAGNOSIS,
    ServiceOrderStatus.AWAITING_APPROVAL,
  ],
  in_progress: [
    ServiceOrderStatus.RECEIVED,
    ServiceOrderStatus.IN_DIAGNOSIS,
    ServiceOrderStatus.AWAITING_APPROVAL,
    ServiceOrderStatus.IN_PROGRESS,
  ],
  rejected: [
    ServiceOrderStatus.RECEIVED,
    ServiceOrderStatus.IN_DIAGNOSIS,
    ServiceOrderStatus.AWAITING_APPROVAL,
    ServiceOrderStatus.FINISHED,
  ],
  executed: [
    ServiceOrderStatus.RECEIVED,
    ServiceOrderStatus.IN_DIAGNOSIS,
    ServiceOrderStatus.AWAITING_APPROVAL,
    ServiceOrderStatus.IN_PROGRESS,
    ServiceOrderStatus.FINISHED,
  ],
  delivered: [
    ServiceOrderStatus.RECEIVED,
    ServiceOrderStatus.IN_DIAGNOSIS,
    ServiceOrderStatus.AWAITING_APPROVAL,
    ServiceOrderStatus.IN_PROGRESS,
    ServiceOrderStatus.FINISHED,
    ServiceOrderStatus.DELIVERED,
  ],
};

export function buildPlans(random: () => number): OrderPlan[] {
  const vehicleKeys = VEHICLES.filter((v) => v.isActive).map((v) => v.key);
  const serviceKeys = Object.keys(RECIPES);
  const plans: OrderPlan[] = [];

  let index = 0;
  for (const { outcome, count } of DISTRIBUTION) {
    for (let i = 0; i < count; i += 1) {
      const chosen = pickServices(random, serviceKeys, outcome);
      plans.push({
        vehicleKey: vehicleKeys[index % vehicleKeys.length],
        description: COMPLAINTS[index % COMPLAINTS.length],
        services: chosen.map((key) => ({
          key,
          quantity: key === 'oleo' ? 1 : 1,
        })),
        parts: linesFor(random, chosen, 'parts'),
        supplies: linesFor(random, chosen, 'supplies'),
        outcome,
        deactivate: DEACTIVATED_AT.includes(index),
      });
      index += 1;
    }
  }

  return plans;
}

function pickServices(
  random: () => number,
  serviceKeys: string[],
  outcome: OrderOutcome,
): string[] {
  if (outcome === 'received') {
    return [];
  }
  const first = serviceKeys[Math.floor(random() * serviceKeys.length)];
  if (random() < 0.2) {
    const second = serviceKeys[Math.floor(random() * serviceKeys.length)];
    if (second !== first) {
      return [first, second];
    }
  }
  return [first];
}

function linesFor(
  random: () => number,
  services: string[],
  kind: 'parts' | 'supplies',
): OrderLine[] {
  const keys = new Set<string>();
  for (const service of services) {
    for (const key of RECIPES[service][kind]) {
      keys.add(key);
    }
  }

  const selected = kind === 'supplies' ? [...keys].slice(0, 1) : [...keys];

  return selected.map((key) => ({
    key,
    quantity:
      kind === 'parts'
        ? 1 + Math.floor(random() * 2)
        : between(random, SUPPLY_QUANTITY[key] ?? [1, 2]),
  }));
}

function between(random: () => number, [min, max]: [number, number]): number {
  return min + Math.floor(random() * (max - min + 1));
}

export function itemsFor(plan: OrderPlan): {
  services: OrderLine[];
  parts: OrderLine[];
  supplies: OrderLine[];
} {
  if (plan.outcome === 'received') {
    return { services: [], parts: [], supplies: [] };
  }
  if (plan.outcome === 'in_diagnosis') {
    return { services: plan.services, parts: plan.parts, supplies: [] };
  }
  return {
    services: plan.services,
    parts: plan.parts,
    supplies: plan.supplies,
  };
}
