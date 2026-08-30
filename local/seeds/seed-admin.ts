import * as bcrypt from 'bcrypt';
import dataSource from '../../src/config/typeorm.config';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserRole } from '../../src/common/enums/user-role.enum';

export async function seedAdmin(): Promise<void> {
  const name = process.env.ADMIN_NAME ?? 'Administrador';
  const email = process.env.ADMIN_EMAIL ?? 'admin@oficina.com';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@123';
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10);

  const repo = dataSource.getRepository(User);
  const existing = await repo.findOne({ where: { email } });

  if (existing) {
    console.log(`[seed] Admin já existe (${email}) — nada a fazer.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, saltRounds);
  const admin = repo.create({
    name,
    email,
    passwordHash,
    role: UserRole.ADMIN,
    isActive: true,
  });
  await repo.save(admin);
  console.log(`[seed] Admin criado com sucesso: ${email}`);
}

async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
    await seedAdmin();
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] Erro ao executar seed:', err);
      process.exit(1);
    });
}
