/**
 * ============================================================================
 * RESET DATABASE — Zera TODA a base e recria o admin do cliente
 * ============================================================================
 *
 * ⚠️  ATENÇÃO: este script APAGA TODOS OS DADOS do banco configurado em
 *     .env.<NODE_ENV> (default: development). Não tem volta.
 *
 * O que ele faz:
 *   1. Pede confirmação (digite o nome do banco) — pule com --force / --yes.
 *   2. DROP DATABASE + CREATE DATABASE (schema 100% vazio).
 *   3. Conecta via TypeORM com synchronize=true, que recria TODAS as tabelas
 *      a partir das *.entity.ts (fonte da verdade — nada de SQL manual, então
 *      novas tabelas/colunas entram sozinhas).
 *   4. Cria o usuário ADMIN usando ADMIN_EMAIL / ADMIN_NAME / ADMIN_PASSWORD
 *      do .env (o cliente quer que o admin use o e-mail dele).
 *
 * Como rodar (a partir de backend/):
 *   npm run db:reset
 *   npm run db:reset -- --force                 # sem confirmação
 *   NODE_ENV=production npm run db:reset -- --force   # outra base
 * ============================================================================
 */
import 'reflect-metadata';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as mysql from 'mysql2/promise';
import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/shared/interfaces/enums';

// Carrega o mesmo .env que o app usa (.env.development por padrão).
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(__dirname, '..', `.env.${env}`) });

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'ciano_cotas',
};

const admin = {
  email: process.env.ADMIN_EMAIL || 'admin@ciano.com',
  name: process.env.ADMIN_NAME || 'Administrador',
  password: process.env.ADMIN_PASSWORD || 'admin123',
};

const force = process.argv.includes('--force') || process.argv.includes('--yes');

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    }),
  );
}

async function confirm(): Promise<boolean> {
  if (force) return true;
  console.log('\n⚠️  Você está prestes a ZERAR completamente o banco:');
  console.log(`    Ambiente : ${env}`);
  console.log(`    Host     : ${cfg.host}:${cfg.port}`);
  console.log(`    Database : ${cfg.database}`);
  console.log('\n    TODOS OS DADOS SERÃO APAGADOS. Esta ação é irreversível.\n');
  const answer = await ask(`Para confirmar, digite o nome do banco ("${cfg.database}"): `);
  return answer === cfg.database;
}

async function resetSchema(): Promise<void> {
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
  });
  try {
    // DROP + recriar = schema vazio. O backtick em volta protege o nome.
    await conn.query(`DROP DATABASE IF EXISTS \`${cfg.database}\``);
    await conn.query(
      `CREATE DATABASE \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    console.log(`🗑️  Database "${cfg.database}" zerado e recriado (vazio).`);
  } finally {
    await conn.end();
  }
}

/**
 * Conecta com synchronize=true para o TypeORM recriar TODAS as tabelas a
 * partir das entities, e então cria o admin. Carregamos todas as *.entity
 * por glob (mesma config do app.module) — assim nenhuma tabela fica de fora
 * e o script não precisa ser atualizado quando surgir uma entity nova.
 */
async function buildSchemaAndAdmin(): Promise<void> {
  const dataSource = new DataSource({
    type: 'mysql',
    host: cfg.host,
    port: cfg.port,
    username: cfg.user,
    password: cfg.password,
    database: cfg.database,
    entities: [path.resolve(__dirname, '..', 'src', '**', '*.entity.ts')],
    synchronize: true,
    charset: 'utf8mb4',
    timezone: 'Z',
  });

  await dataSource.initialize();
  console.log('🧱 Schema recriado a partir das entities (todas as tabelas).');

  try {
    const userRepo = dataSource.getRepository(User);
    const passwordHash = await argon2.hash(admin.password);
    const user = userRepo.create({
      email: admin.email,
      passwordHash,
      name: admin.name,
      cpf: '00000000000',
      phone: '00000000000',
      city: 'Sistema',
      state: 'SP',
      pixKey: admin.email,
      role: UserRole.ADMIN,
      referralCode: 'CIANO-ADMIN',
      isActive: true,
    });
    await userRepo.save(user);

    console.log(`🔑 Admin criado:`);
    console.log(`    Nome  : ${admin.name}`);
    console.log(`    E-mail: ${admin.email}`);
    console.log(`    Senha : ${admin.password}  (defina ADMIN_PASSWORD no .env para trocar)`);
  } finally {
    await dataSource.destroy();
  }
}

async function main(): Promise<void> {
  if (!(await confirm())) {
    console.log('\n❌ Cancelado. Nada foi alterado.');
    process.exit(1);
  }

  await resetSchema();
  await buildSchemaAndAdmin();

  console.log('\n✅ Pronto. Base zerada, todas as tabelas recriadas e admin criado.');
  console.log('   Suba o servidor — o SeedService completa settings/títulos/estado de cotas.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n💥 Falha no reset:', err.message);
  process.exit(1);
});
