import { MeasurementUnit } from '../../common/enums/measurement-unit.enum';
import { ServiceOrderStatus } from '../../common/enums/service-order-status.enum';
import { TestApp } from './test-app';

export const CUSTOMER_PAYLOAD = {
  name: 'Maria Souza',
  document: '529.982.247-25',
  email: 'maria.souza@exemplo.com',
  phone: '11999998888',
};

export const VEHICLE_PAYLOAD = {
  plate: 'abc-1d23',
  brand: 'Volkswagen',
  model: 'Gol',
  year: 2020,
};

export const SERVICE_PAYLOAD = {
  name: 'Troca de óleo',
  description: 'Substituição do óleo do motor e do filtro.',
  price: 189.9,
  estimatedMinutes: 60,
};

export const PART_PAYLOAD = {
  code: 'flt oil-001',
  name: 'Filtro de óleo',
  brand: 'Bosch',
  unitPrice: 49.9,
  stockQuantity: 10,
  minimumStock: 2,
};

export const SUPPLY_PAYLOAD = {
  code: 'oleo 5w30',
  name: 'Óleo sintético 5W30',
  unit: MeasurementUnit.L,
  unitPrice: 38.5,
  stockQuantity: 40,
  minimumStock: 10,
};

export interface CatalogIds {
  serviceId: string;
  partId: string;
  supplyId: string;
}

export async function createCustomer(
  ctx: TestApp,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const { body } = await ctx
    .asAdmin('post', '/customers')
    .send({ ...CUSTOMER_PAYLOAD, ...overrides })
    .expect(201);
  return body.id as string;
}

export async function createVehicle(
  ctx: TestApp,
  customerId: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const { body } = await ctx
    .asAdmin('post', '/vehicles')
    .send({ ...VEHICLE_PAYLOAD, customerId, ...overrides })
    .expect(201);
  return body.id as string;
}

export async function createService(
  ctx: TestApp,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const { body } = await ctx
    .asAdmin('post', '/services')
    .send({ ...SERVICE_PAYLOAD, ...overrides })
    .expect(201);
  return body.id as string;
}

export async function createPart(
  ctx: TestApp,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const { body } = await ctx
    .asAdmin('post', '/parts')
    .send({ ...PART_PAYLOAD, ...overrides })
    .expect(201);
  return body.id as string;
}

export async function createSupply(
  ctx: TestApp,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const { body } = await ctx
    .asAdmin('post', '/supplies')
    .send({ ...SUPPLY_PAYLOAD, ...overrides })
    .expect(201);
  return body.id as string;
}

export async function createCatalog(ctx: TestApp): Promise<CatalogIds> {
  return {
    serviceId: await createService(ctx),
    partId: await createPart(ctx),
    supplyId: await createSupply(ctx),
  };
}

export async function openOrder(
  ctx: TestApp,
  customerId: string,
  vehicleId: string,
): Promise<string> {
  const { body } = await ctx
    .asMechanic('post', '/service-orders')
    .send({ customerId, vehicleId })
    .expect(201);
  await ctx
    .asMechanic('patch', `/service-orders/${body.id}/status`)
    .send({ status: ServiceOrderStatus.IN_DIAGNOSIS })
    .expect(200);
  return body.id as string;
}

export async function fillOrder(
  ctx: TestApp,
  orderId: string,
  catalog: CatalogIds,
  quantities = { service: 2, part: 2, supply: 4 },
): Promise<Record<string, never>> {
  await ctx
    .asMechanic('post', `/service-orders/${orderId}/services`)
    .send({ serviceId: catalog.serviceId, quantity: quantities.service })
    .expect(201);
  await ctx
    .asMechanic('post', `/service-orders/${orderId}/parts`)
    .send({ partId: catalog.partId, quantity: quantities.part })
    .expect(201);
  const { body } = await ctx
    .asMechanic('post', `/service-orders/${orderId}/supplies`)
    .send({ supplyId: catalog.supplyId, quantity: quantities.supply })
    .expect(201);
  return body as Record<string, never>;
}

export async function readPart(
  ctx: TestApp,
  partId: string,
): Promise<Record<string, number>> {
  const { body } = await ctx.asAdmin('get', `/parts/${partId}`).expect(200);
  return body as Record<string, number>;
}
