import { Test, TestingModule } from '@nestjs/testing';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from './entities/vehicle.entity';

describe('VehiclesController', () => {
  let controller: VehiclesController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    findByPlate: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const vehicle: Vehicle = {
    id: 'vehicle-1',
    plate: 'ABC1D23',
    brand: 'Volkswagen',
    model: 'Gol',
    year: 2020,
    customerId: 'customer-1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Vehicle;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByPlate: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehiclesController],
      providers: [{ provide: VehiclesService, useValue: service }],
    }).compile();

    controller = module.get<VehiclesController>(VehiclesController);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should create a vehicle and return a DTO', async () => {
    service.create.mockResolvedValue(vehicle);

    const result = await controller.create({
      plate: 'abc-1d23',
      brand: 'Volkswagen',
      model: 'Gol',
      year: 2020,
      customerId: 'customer-1',
    });

    expect(result.plate).toBe('ABC1D23');
    expect(result).not.toHaveProperty('customer');
  });

  it('should list the vehicles of a customer', async () => {
    service.findAll.mockResolvedValue([vehicle]);

    const result = await controller.findAll('customer-1', false);

    expect(service.findAll).toHaveBeenCalledWith('customer-1', false);
    expect(result).toHaveLength(1);
  });

  it('should identify a vehicle by plate', async () => {
    service.findByPlate.mockResolvedValue(vehicle);

    const result = await controller.findByPlate('abc-1d23');

    expect(service.findByPlate).toHaveBeenCalledWith('abc-1d23');
    expect(result.id).toBe('vehicle-1');
  });

  it('should detail a vehicle', async () => {
    service.findOne.mockResolvedValue(vehicle);
    const result = await controller.findOne('vehicle-1');
    expect(result.model).toBe('Gol');
  });

  it('should update a vehicle', async () => {
    service.update.mockResolvedValue({ ...vehicle, model: 'Polo' });

    const result = await controller.update('vehicle-1', { model: 'Polo' });

    expect(result.model).toBe('Polo');
    expect(service.update).toHaveBeenCalledWith('vehicle-1', {
      model: 'Polo',
    });
  });

  it('should deactivate a vehicle', async () => {
    service.remove.mockResolvedValue(undefined);
    await controller.remove('vehicle-1');
    expect(service.remove).toHaveBeenCalledWith('vehicle-1');
  });
});
