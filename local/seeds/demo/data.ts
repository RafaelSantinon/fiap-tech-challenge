import { MeasurementUnit } from '../../../src/common/enums/measurement-unit.enum';

export interface MechanicSeed {
  name: string;
  email: string;
  password: string;
  isActive: boolean;
}

export interface CustomerSeed {
  key: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  isActive: boolean;
}

export interface VehicleSeed {
  key: string;
  customerKey: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  isActive: boolean;
}

export interface ServiceSeed {
  key: string;
  name: string;
  description: string;
  price: number;
  estimatedMinutes: number;
  isActive: boolean;
}

export interface PartSeed {
  key: string;
  code: string;
  name: string;
  brand: string;
  unitPrice: number;
  stockQuantity: number;
  minimumStock: number;
  isActive: boolean;
}

export interface SupplySeed {
  key: string;
  code: string;
  name: string;
  unit: MeasurementUnit;
  unitPrice: number;
  stockQuantity: number;
  minimumStock: number;
  isActive: boolean;
}

export const MECHANICS: MechanicSeed[] = [
  {
    name: 'João Pereira',
    email: 'joao.pereira@oficina.com',
    password: 'Mecanico@123',
    isActive: true,
  },
  {
    name: 'Rafael Lima',
    email: 'rafael.lima@oficina.com',
    password: 'Mecanico@123',
    isActive: true,
  },
  {
    name: 'Ana Carvalho',
    email: 'ana.carvalho@oficina.com',
    password: 'Mecanico@123',
    isActive: false,
  },
];

export const CUSTOMERS: CustomerSeed[] = [
  {
    key: 'maria',
    name: 'Maria Souza',
    document: '52998224725',
    email: 'maria.souza@exemplo.com',
    phone: '11987654321',
    isActive: true,
  },
  {
    key: 'carlos',
    name: 'Carlos Andrade',
    document: '11144477735',
    email: 'carlos.andrade@exemplo.com',
    phone: '11976543210',
    isActive: true,
  },
  {
    key: 'juliana',
    name: 'Juliana Ferreira',
    document: '39053344705',
    email: 'juliana.ferreira@exemplo.com',
    phone: '21965432109',
    isActive: true,
  },
  {
    key: 'roberto',
    name: 'Roberto Nunes',
    document: '12809953007',
    email: 'roberto.nunes@exemplo.com',
    phone: '31954321098',
    isActive: true,
  },
  {
    key: 'patricia',
    name: 'Patrícia Gomes',
    document: '24681357928',
    email: 'patricia.gomes@exemplo.com',
    phone: '41943210987',
    isActive: true,
  },
  {
    key: 'eduardo',
    name: 'Eduardo Castro',
    document: '33581294702',
    email: 'eduardo.castro@exemplo.com',
    phone: '51932109876',
    isActive: true,
  },
  {
    key: 'fernanda',
    name: 'Fernanda Ribeiro',
    document: '47028361535',
    email: 'fernanda.ribeiro@exemplo.com',
    phone: '61921098765',
    isActive: true,
  },
  {
    key: 'marcos',
    name: 'Marcos Vinícius Alves',
    document: '58294610305',
    email: 'marcos.alves@exemplo.com',
    phone: '71910987654',
    isActive: true,
  },
  {
    key: 'transportes',
    name: 'Transportes Aurora LTDA',
    document: '11222333000181',
    email: 'frota@aurora.com.br',
    phone: '1133224455',
    isActive: true,
  },
  {
    key: 'entregas',
    name: 'Entregas Rápidas ME',
    document: '33445566000186',
    email: 'contato@entregasrapidas.com.br',
    phone: '1133445566',
    isActive: true,
  },
  {
    key: 'locadora',
    name: 'Locadora Horizonte SA',
    document: '55667788000186',
    email: 'manutencao@horizonte.com.br',
    phone: '1133667788',
    isActive: true,
  },
  {
    key: 'inativo',
    name: 'Antigo Cliente ME',
    document: '77889900000166',
    email: 'antigo@exemplo.com.br',
    phone: '1133990011',
    isActive: false,
  },
];

export const VEHICLES: VehicleSeed[] = [
  {
    key: 'gol',
    customerKey: 'maria',
    plate: 'ABC1D23',
    brand: 'Volkswagen',
    model: 'Gol',
    year: 2020,
    isActive: true,
  },
  {
    key: 'onix',
    customerKey: 'maria',
    plate: 'DEF4G56',
    brand: 'Chevrolet',
    model: 'Onix',
    year: 2022,
    isActive: true,
  },
  {
    key: 'argo',
    customerKey: 'carlos',
    plate: 'GHI7J89',
    brand: 'Fiat',
    model: 'Argo',
    year: 2021,
    isActive: true,
  },
  {
    key: 'hb20',
    customerKey: 'juliana',
    plate: 'JKL1234',
    brand: 'Hyundai',
    model: 'HB20',
    year: 2019,
    isActive: true,
  },
  {
    key: 'corolla',
    customerKey: 'roberto',
    plate: 'MNO5678',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2023,
    isActive: true,
  },
  {
    key: 'civic',
    customerKey: 'roberto',
    plate: 'PQR9012',
    brand: 'Honda',
    model: 'Civic',
    year: 2018,
    isActive: true,
  },
  {
    key: 'kwid',
    customerKey: 'patricia',
    plate: 'STU3A45',
    brand: 'Renault',
    model: 'Kwid',
    year: 2021,
    isActive: true,
  },
  {
    key: 'compass',
    customerKey: 'eduardo',
    plate: 'VWX6B78',
    brand: 'Jeep',
    model: 'Compass',
    year: 2022,
    isActive: true,
  },
  {
    key: 'tracker',
    customerKey: 'fernanda',
    plate: 'YZA9C01',
    brand: 'Chevrolet',
    model: 'Tracker',
    year: 2023,
    isActive: true,
  },
  {
    key: 'polo',
    customerKey: 'marcos',
    plate: 'BCD2E34',
    brand: 'Volkswagen',
    model: 'Polo',
    year: 2020,
    isActive: true,
  },
  {
    key: 'strada',
    customerKey: 'marcos',
    plate: 'EFG5H67',
    brand: 'Fiat',
    model: 'Strada',
    year: 2019,
    isActive: true,
  },
  {
    key: 'ducato',
    customerKey: 'transportes',
    plate: 'HIJ8I90',
    brand: 'Fiat',
    model: 'Ducato',
    year: 2021,
    isActive: true,
  },
  {
    key: 'sprinter',
    customerKey: 'transportes',
    plate: 'KLM1J23',
    brand: 'Mercedes-Benz',
    model: 'Sprinter',
    year: 2022,
    isActive: true,
  },
  {
    key: 'master',
    customerKey: 'transportes',
    plate: 'NOP4567',
    brand: 'Renault',
    model: 'Master',
    year: 2020,
    isActive: true,
  },
  {
    key: 'fiorino',
    customerKey: 'entregas',
    plate: 'QRS8901',
    brand: 'Fiat',
    model: 'Fiorino',
    year: 2018,
    isActive: true,
  },
  {
    key: 'saveiro',
    customerKey: 'entregas',
    plate: 'TUV2345',
    brand: 'Volkswagen',
    model: 'Saveiro',
    year: 2021,
    isActive: true,
  },
  {
    key: 'mobi',
    customerKey: 'locadora',
    plate: 'WXY6789',
    brand: 'Fiat',
    model: 'Mobi',
    year: 2023,
    isActive: true,
  },
  {
    key: 'sandero',
    customerKey: 'locadora',
    plate: 'ZAB0123',
    brand: 'Renault',
    model: 'Sandero',
    year: 2022,
    isActive: true,
  },
  {
    key: 'city',
    customerKey: 'locadora',
    plate: 'CDE4F56',
    brand: 'Honda',
    model: 'City',
    year: 2023,
    isActive: true,
  },
  {
    key: 'antigo',
    customerKey: 'juliana',
    plate: 'FGH7G89',
    brand: 'Ford',
    model: 'Ka',
    year: 2014,
    isActive: false,
  },
];

export const SERVICES: ServiceSeed[] = [
  {
    key: 'oleo',
    name: 'Troca de óleo',
    description: 'Substituição do óleo do motor e do filtro.',
    price: 189.9,
    estimatedMinutes: 60,
    isActive: true,
  },
  {
    key: 'alinhamento',
    name: 'Alinhamento e balanceamento',
    description: 'Alinhamento da direção e balanceamento das quatro rodas.',
    price: 149.9,
    estimatedMinutes: 90,
    isActive: true,
  },
  {
    key: 'freios',
    name: 'Revisão de freios',
    description: 'Troca de pastilhas, verificação de discos e fluido.',
    price: 320,
    estimatedMinutes: 120,
    isActive: true,
  },
  {
    key: 'suspensao',
    name: 'Reparo de suspensão',
    description: 'Substituição de amortecedores, buchas e batentes.',
    price: 780,
    estimatedMinutes: 240,
    isActive: true,
  },
  {
    key: 'revisao',
    name: 'Revisão completa',
    description: 'Revisão dos 30 itens de segurança e manutenção.',
    price: 990,
    estimatedMinutes: 240,
    isActive: true,
  },
  {
    key: 'correia',
    name: 'Troca da correia dentada',
    description: 'Substituição da correia dentada e tensor.',
    price: 650,
    estimatedMinutes: 180,
    isActive: true,
  },
  {
    key: 'arcondicionado',
    name: 'Higienização do ar-condicionado',
    description: 'Limpeza do evaporador e troca do filtro de cabine.',
    price: 210,
    estimatedMinutes: 45,
    isActive: true,
  },
  {
    key: 'bateria',
    name: 'Substituição da bateria',
    description: 'Teste do sistema de carga e troca da bateria.',
    price: 120,
    estimatedMinutes: 30,
    isActive: true,
  },
  {
    key: 'embreagem',
    name: 'Troca de embreagem',
    description: 'Substituição do kit de embreagem completo.',
    price: 1450,
    estimatedMinutes: 240,
    isActive: true,
  },
  {
    key: 'lavagem',
    name: 'Lavagem técnica do motor',
    description: 'Serviço descontinuado.',
    price: 180,
    estimatedMinutes: 60,
    isActive: false,
  },
];

export const PARTS: PartSeed[] = [
  {
    key: 'filtro-oleo',
    code: 'FLTOIL-001',
    name: 'Filtro de óleo',
    brand: 'Bosch',
    unitPrice: 49.9,
    stockQuantity: 120,
    minimumStock: 20,
    isActive: true,
  },
  {
    key: 'filtro-ar',
    code: 'FLTAR-002',
    name: 'Filtro de ar',
    brand: 'Mann',
    unitPrice: 68.5,
    stockQuantity: 90,
    minimumStock: 15,
    isActive: true,
  },
  {
    key: 'filtro-cabine',
    code: 'FLTCAB-003',
    name: 'Filtro de cabine',
    brand: 'Tecfil',
    unitPrice: 54.9,
    stockQuantity: 80,
    minimumStock: 15,
    isActive: true,
  },
  {
    key: 'pastilha',
    code: 'PSTFRE-004',
    name: 'Pastilha de freio dianteira',
    brand: 'Fras-le',
    unitPrice: 189.9,
    stockQuantity: 60,
    minimumStock: 12,
    isActive: true,
  },
  {
    key: 'disco',
    code: 'DSCFRE-005',
    name: 'Disco de freio ventilado',
    brand: 'Fremax',
    unitPrice: 289.9,
    stockQuantity: 40,
    minimumStock: 10,
    isActive: true,
  },
  {
    key: 'amortecedor',
    code: 'AMTDIA-006',
    name: 'Amortecedor dianteiro',
    brand: 'Cofap',
    unitPrice: 420,
    stockQuantity: 30,
    minimumStock: 8,
    isActive: true,
  },
  {
    key: 'bucha',
    code: 'BCHBAN-007',
    name: 'Bucha da bandeja',
    brand: 'Nakata',
    unitPrice: 89.9,
    stockQuantity: 75,
    minimumStock: 20,
    isActive: true,
  },
  {
    key: 'correia',
    code: 'CRRDEN-008',
    name: 'Correia dentada',
    brand: 'Gates',
    unitPrice: 210,
    stockQuantity: 35,
    minimumStock: 10,
    isActive: true,
  },
  {
    key: 'tensor',
    code: 'TNSCRR-009',
    name: 'Tensor da correia',
    brand: 'SKF',
    unitPrice: 265,
    stockQuantity: 28,
    minimumStock: 8,
    isActive: true,
  },
  {
    key: 'bateria',
    code: 'BAT60AH-010',
    name: 'Bateria 60Ah',
    brand: 'Moura',
    unitPrice: 549,
    stockQuantity: 25,
    minimumStock: 6,
    isActive: true,
  },
  {
    key: 'vela',
    code: 'VELIGN-011',
    name: 'Vela de ignição',
    brand: 'NGK',
    unitPrice: 39.9,
    stockQuantity: 200,
    minimumStock: 40,
    isActive: true,
  },
  {
    key: 'embreagem',
    code: 'KITEMB-012',
    name: 'Kit de embreagem',
    brand: 'Luk',
    unitPrice: 890,
    stockQuantity: 14,
    minimumStock: 4,
    isActive: true,
  },
  {
    key: 'baixo-estoque',
    code: 'PALHET-013',
    name: 'Palheta do limpador',
    brand: 'Dyna',
    unitPrice: 44.9,
    stockQuantity: 3,
    minimumStock: 25,
    isActive: true,
  },
  {
    key: 'sem-estoque',
    code: 'RADIAD-014',
    name: 'Radiador',
    brand: 'Valeo',
    unitPrice: 780,
    stockQuantity: 0,
    minimumStock: 5,
    isActive: true,
  },
  {
    key: 'inativa',
    code: 'CARBUR-015',
    name: 'Carburador',
    brand: 'Weber',
    unitPrice: 640,
    stockQuantity: 6,
    minimumStock: 2,
    isActive: false,
  },
];

export const SUPPLIES: SupplySeed[] = [
  {
    key: 'oleo-5w30',
    code: 'OLEO5W30',
    name: 'Óleo sintético 5W30',
    unit: MeasurementUnit.L,
    unitPrice: 38.5,
    stockQuantity: 400,
    minimumStock: 60,
    isActive: true,
  },
  {
    key: 'oleo-15w40',
    code: 'OLEO15W40',
    name: 'Óleo semissintético 15W40',
    unit: MeasurementUnit.L,
    unitPrice: 29.9,
    stockQuantity: 300,
    minimumStock: 50,
    isActive: true,
  },
  {
    key: 'fluido-freio',
    code: 'FLDFREIO',
    name: 'Fluido de freio DOT4',
    unit: MeasurementUnit.ML,
    unitPrice: 0.09,
    stockQuantity: 20000,
    minimumStock: 4000,
    isActive: true,
  },
  {
    key: 'aditivo',
    code: 'ADITRAD',
    name: 'Aditivo para radiador',
    unit: MeasurementUnit.L,
    unitPrice: 24.9,
    stockQuantity: 180,
    minimumStock: 30,
    isActive: true,
  },
  {
    key: 'graxa',
    code: 'GRAXALIT',
    name: 'Graxa de lítio',
    unit: MeasurementUnit.KG,
    unitPrice: 42,
    stockQuantity: 60,
    minimumStock: 10,
    isActive: true,
  },
  {
    key: 'desengraxante',
    code: 'DESENGX',
    name: 'Desengraxante concentrado',
    unit: MeasurementUnit.G,
    unitPrice: 0.05,
    stockQuantity: 50000,
    minimumStock: 8000,
    isActive: true,
  },
  {
    key: 'estopa',
    code: 'ESTOPA',
    name: 'Estopa industrial',
    unit: MeasurementUnit.UN,
    unitPrice: 6.5,
    stockQuantity: 500,
    minimumStock: 80,
    isActive: true,
  },
  {
    key: 'inativo',
    code: 'SPRAYANT',
    name: 'Spray antiferrugem',
    unit: MeasurementUnit.UN,
    unitPrice: 34.9,
    stockQuantity: 12,
    minimumStock: 5,
    isActive: false,
  },
];
