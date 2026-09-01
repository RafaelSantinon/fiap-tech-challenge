import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { UserRole } from '../../src/common/enums/user-role.enum';
import { ServiceOrderStatus } from '../../src/common/enums/service-order-status.enum';
import { UsersService } from '../../src/modules/users/users.service';
import { CustomersService } from '../../src/modules/customers/customers.service';
import { VehiclesService } from '../../src/modules/vehicles/vehicles.service';
import { ServicesService } from '../../src/modules/services/services.service';
import { PartsService } from '../../src/modules/parts/parts.service';
import { SuppliesService } from '../../src/modules/supplies/supplies.service';
import { ServiceOrdersService } from '../../src/modules/service-orders/service-orders.service';
import { ServiceOrderWorkflowService } from '../../src/modules/service-order-workflow/service-order-workflow.service';
import {
  CUSTOMERS,
  MECHANICS,
  PARTS,
  SERVICES,
  SUPPLIES,
  VEHICLES,
} from './demo/data';
import { applyTiming, buildTiming, createRandom } from './demo/clock';
import {
  OrderPlan,
  STATUS_PATHS,
  buildPlans,
  itemsFor,
} from './demo/scenarios';

const DOMAIN_TABLES = [
  'quotes',
  'service_order_supplies',
  'service_order_parts',
  'service_order_services',
  'service_orders',
  'supplies',
  'parts',
  'services',
  'vehicles',
  'customers',
];

const log = (message: string) => console.log(`[seed:demo] ${message}`);

async function alreadySeeded(dataSource: DataSource): Promise<boolean> {
  const [{ total }] = (await dataSource.query(
    `SELECT (SELECT count(*) FROM "customers") +
            (SELECT count(*) FROM "service_orders") AS total`,
  )) as Array<{ total: string }>;
  return Number(total) > 0;
}

async function reset(dataSource: DataSource): Promise<void> {
  log('limpando as tabelas de domínio');
  const tables = DOMAIN_TABLES.map((table) => `"${table}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
  await dataSource.query(`DELETE FROM "users" WHERE "email" = ANY($1)`, [
    MECHANICS.map((mechanic) => mechanic.email),
  ]);
}

async function run(): Promise<void> {
  const shouldReset = process.argv.includes('--reset');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);

    if (shouldReset) {
      await reset(dataSource);
    } else if (await alreadySeeded(dataSource)) {
      log('dados de demonstração já presentes, nada a fazer.');
      return;
    }

    const users = app.get(UsersService);
    const customers = app.get(CustomersService);
    const vehicles = app.get(VehiclesService);
    const services = app.get(ServicesService);
    const parts = app.get(PartsService);
    const supplies = app.get(SuppliesService);
    const orders = app.get(ServiceOrdersService);
    const workflow = app.get(ServiceOrderWorkflowService);

    for (const mechanic of MECHANICS) {
      const created = await users.create({
        name: mechanic.name,
        email: mechanic.email,
        password: mechanic.password,
        role: UserRole.MECHANIC,
      });
      if (!mechanic.isActive) {
        await users.update(created.id, { isActive: false });
      }
    }

    const customerIds = new Map<string, string>();
    for (const customer of CUSTOMERS) {
      const created = await customers.create({
        name: customer.name,
        document: customer.document,
        email: customer.email,
        phone: customer.phone,
      });
      customerIds.set(customer.key, created.id);
    }

    const vehicleIds = new Map<string, string>();
    const vehicleOwners = new Map<string, string>();
    for (const vehicle of VEHICLES) {
      const customerId = customerIds.get(vehicle.customerKey) as string;
      const created = await vehicles.create({
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        customerId,
      });
      vehicleIds.set(vehicle.key, created.id);
      vehicleOwners.set(vehicle.key, customerId);
    }

    const serviceIds = new Map<string, string>();
    const serviceMinutes = new Map<string, number>();
    for (const service of SERVICES) {
      const created = await services.create({
        name: service.name,
        description: service.description,
        price: service.price,
        estimatedMinutes: service.estimatedMinutes,
      });
      serviceIds.set(service.key, created.id);
      serviceMinutes.set(service.key, service.estimatedMinutes);
    }

    const partIds = new Map<string, string>();
    for (const part of PARTS) {
      const created = await parts.create({
        code: part.code,
        name: part.name,
        brand: part.brand,
        unitPrice: part.unitPrice,
        stockQuantity: part.stockQuantity,
        minimumStock: part.minimumStock,
      });
      partIds.set(part.key, created.id);
    }

    const supplyIds = new Map<string, string>();
    for (const supply of SUPPLIES) {
      const created = await supplies.create({
        code: supply.code,
        name: supply.name,
        unit: supply.unit,
        unitPrice: supply.unitPrice,
        stockQuantity: supply.stockQuantity,
        minimumStock: supply.minimumStock,
      });
      supplyIds.set(supply.key, created.id);
    }

    const random = createRandom();
    const plans = buildPlans(random);
    const pendingNumbers: string[] = [];
    const counters = new Map<string, number>();
    let deactivated = 0;

    for (const plan of plans) {
      const number = await replay(plan, {
        orders,
        workflow,
        vehicleIds,
        vehicleOwners,
        serviceIds,
        partIds,
        supplyIds,
      });

      const order = await orders.findByNumber(number);
      const estimated = plan.services.reduce(
        (total, line) =>
          total + (serviceMinutes.get(line.key) ?? 60) * line.quantity,
        0,
      );
      await applyTiming(
        dataSource,
        order.id,
        buildTiming(random, STATUS_PATHS[plan.outcome], estimated),
      );

      if (plan.deactivate) {
        await orders.remove(order.id);
        deactivated += 1;
      } else if (plan.outcome === 'awaiting_approval') {
        pendingNumbers.push(number);
      }

      counters.set(order.status, (counters.get(order.status) ?? 0) + 1);
    }

    await deactivateCatalog({
      dataSource,
      customers,
      vehicles,
      services,
      parts,
      supplies,
      customerIds,
      vehicleIds,
      serviceIds,
      partIds,
      supplyIds,
    });

    report(counters, deactivated, pendingNumbers);
  } finally {
    await app.close();
  }
}

interface ReplayContext {
  orders: ServiceOrdersService;
  workflow: ServiceOrderWorkflowService;
  vehicleIds: Map<string, string>;
  vehicleOwners: Map<string, string>;
  serviceIds: Map<string, string>;
  partIds: Map<string, string>;
  supplyIds: Map<string, string>;
}

async function replay(plan: OrderPlan, ctx: ReplayContext): Promise<string> {
  const created = await ctx.orders.create({
    customerId: ctx.vehicleOwners.get(plan.vehicleKey) as string,
    vehicleId: ctx.vehicleIds.get(plan.vehicleKey) as string,
    description: plan.description,
  });

  if (plan.outcome === 'received') {
    return created.number;
  }

  await ctx.orders.changeStatusManually(
    created.id,
    ServiceOrderStatus.IN_DIAGNOSIS,
  );

  const items = itemsFor(plan);
  for (const line of items.services) {
    await ctx.workflow.addService(created.id, {
      serviceId: ctx.serviceIds.get(line.key) as string,
      quantity: line.quantity,
    });
  }
  for (const line of items.parts) {
    await ctx.workflow.addPart(created.id, {
      partId: ctx.partIds.get(line.key) as string,
      quantity: line.quantity,
    });
  }
  for (const line of items.supplies) {
    await ctx.workflow.addSupply(created.id, {
      supplyId: ctx.supplyIds.get(line.key) as string,
      quantity: line.quantity,
    });
  }

  if (plan.outcome === 'in_diagnosis' || plan.outcome === 'awaiting_approval') {
    return created.number;
  }

  if (plan.outcome === 'rejected') {
    await ctx.workflow.reject(created.number);
    return created.number;
  }

  await ctx.workflow.approve(created.number);

  if (plan.outcome === 'in_progress') {
    return created.number;
  }

  await ctx.orders.changeStatusManually(
    created.id,
    ServiceOrderStatus.FINISHED,
  );

  if (plan.outcome === 'executed') {
    return created.number;
  }

  await ctx.orders.changeStatusManually(
    created.id,
    ServiceOrderStatus.DELIVERED,
  );
  return created.number;
}

interface CatalogContext {
  dataSource: DataSource;
  customers: CustomersService;
  vehicles: VehiclesService;
  services: ServicesService;
  parts: PartsService;
  supplies: SuppliesService;
  customerIds: Map<string, string>;
  vehicleIds: Map<string, string>;
  serviceIds: Map<string, string>;
  partIds: Map<string, string>;
  supplyIds: Map<string, string>;
}

async function deactivateCatalog(ctx: CatalogContext): Promise<void> {
  for (const service of SERVICES.filter((item) => !item.isActive)) {
    await ctx.services.remove(ctx.serviceIds.get(service.key) as string);
  }
  for (const part of PARTS.filter((item) => !item.isActive)) {
    await ctx.parts.remove(ctx.partIds.get(part.key) as string);
  }
  for (const supply of SUPPLIES.filter((item) => !item.isActive)) {
    await ctx.supplies.remove(ctx.supplyIds.get(supply.key) as string);
  }
  for (const vehicle of VEHICLES.filter((item) => !item.isActive)) {
    await ctx.vehicles.remove(ctx.vehicleIds.get(vehicle.key) as string);
  }
  for (const customer of CUSTOMERS.filter((item) => !item.isActive)) {
    await ctx.customers.remove(ctx.customerIds.get(customer.key) as string);
  }
}

function report(
  counters: Map<string, number>,
  deactivated: number,
  pendingNumbers: string[],
): void {
  const activeCustomers = CUSTOMERS.filter((item) => item.isActive).length;
  log(
    `${CUSTOMERS.length} clientes (${activeCustomers} ativos), ` +
      `${VEHICLES.length} veículos, ${SERVICES.length} serviços, ` +
      `${PARTS.length} peças, ${SUPPLIES.length} insumos, ` +
      `${MECHANICS.length} mecânicos`,
  );

  const byStatus = [...counters.entries()]
    .map(([status, total]) => `${total} ${status}`)
    .join(', ');
  const totalOrders = [...counters.values()].reduce((a, b) => a + b, 0);
  log(`${totalOrders} ordens: ${byStatus} (${deactivated} inativadas)`);

  const emptyPart = PARTS.find((part) => part.stockQuantity === 0);
  const lowPart = PARTS.find(
    (part) => part.stockQuantity > 0 && part.stockQuantity < part.minimumStock,
  );

  log(`orçamento pendente para a API pública: ${pendingNumbers[0] ?? '-'}`);
  log(`peça sem estoque (para o 409): ${emptyPart?.code ?? '-'}`);
  log(`peça abaixo do mínimo: ${lowPart?.code ?? '-'}`);
  log('detalhes em docs/domain.md');
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed:demo] erro ao executar o seed:', err);
      process.exit(1);
    });
}
