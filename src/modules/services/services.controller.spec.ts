import { Test, TestingModule } from '@nestjs/testing';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { Service } from './entities/service.entity';

describe('ServicesController', () => {
  let controller: ServicesController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const buildService = (overrides: Partial<Service> = {}): Service =>
    ({
      id: 'service-1',
      name: 'Troca de óleo',
      description: 'Substituição do óleo do motor.',
      price: 189.9,
      estimatedMinutes: 60,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Service;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [{ provide: ServicesService, useValue: service }],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    it('should create a service and return a DTO', async () => {
      service.create.mockResolvedValue(buildService());

      const result = await controller.create({
        name: 'Troca de óleo',
        price: 189.9,
        estimatedMinutes: 60,
      });

      expect(result).toMatchObject({
        id: 'service-1',
        name: 'Troca de óleo',
        price: 189.9,
        estimatedMinutes: 60,
      });
    });
  });

  describe('findAll', () => {
    it('should list services forwarding the includeInactive flag', async () => {
      service.findAll.mockResolvedValue([buildService()]);

      const result = await controller.findAll(true);

      expect(service.findAll).toHaveBeenCalledWith(true);
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should detail a service by id', async () => {
      service.findOne.mockResolvedValue(buildService());

      const result = await controller.findOne('service-1');

      expect(service.findOne).toHaveBeenCalledWith('service-1');
      expect(result.name).toBe('Troca de óleo');
    });
  });

  describe('update', () => {
    it('should forward the payload to the service', async () => {
      service.update.mockResolvedValue(buildService({ price: 210.5 }));

      const result = await controller.update('service-1', { price: 210.5 });

      expect(service.update).toHaveBeenCalledWith('service-1', {
        price: 210.5,
      });
      expect(result.price).toBe(210.5);
    });
  });

  describe('remove', () => {
    it('should deactivate the service', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('service-1');

      expect(service.remove).toHaveBeenCalledWith('service-1');
    });
  });
});
