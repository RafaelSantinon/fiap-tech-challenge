export interface AppConfig {
  port: number;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
  };
  jwt: {
    accessSecret: string;
    accessExpires: string;
    refreshSecret: string;
    refreshExpires: string;
  };
  bcrypt: {
    saltRounds: number;
  };
  admin: {
    name: string;
    email: string;
    password: string;
  };
}

const configuration = (): AppConfig => ({
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number.parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    name: process.env.DB_NAME ?? 'mechanic_workshop',
  },
  jwt: {
    accessSecret: process.env.JWT_SECRET ?? 'change-me-access-secret',
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '10m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  bcrypt: {
    saltRounds: Number.parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10),
  },
  admin: {
    name: process.env.ADMIN_NAME ?? 'Administrador',
    email: process.env.ADMIN_EMAIL ?? 'admin@oficina.com',
    password: process.env.ADMIN_PASSWORD ?? 'Admin@123',
  },
});

export default configuration;
