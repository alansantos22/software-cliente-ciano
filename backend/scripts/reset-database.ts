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
 *   3. Cria o usuário ADMIN usando ADMIN_EMAIL / ADMIN_NAME / ADMIN_PASSWORD
 *      do .env (o cliente quer que o admin use o e-mail dele).
 *
 * Como rodar (a partir de backend/):
 *   npx ts-node -r tsconfig-paths/register scripts/reset-database.ts
 *   npx ts-node scripts/reset-database.ts --force        # sem confirmação
 *   NODE_ENV=production npx ts-node scripts/reset-database.ts   # outra base
 *
 * Obs.: após o reset, o TypeORM (synchronize) recria as tabelas no próximo
 * boot do servidor e o SeedService repopula settings/títulos/etc. O admin já
 * é criado aqui para o script funcionar sozinho, sem precisar subir a API.
 * ============================================================================
 */
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as mysql from 'mysql2/promise';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

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
    multipleStatements: true,
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
 * Cria a tabela `users` COMPLETA (todas as colunas da entity User) e insere
 * o admin. É essencial que TODAS as colunas existam — uma tabela parcial
 * (faltando, p.ex., pix_key_type) quebra o app na primeira query com
 * "Unknown column 'User.pix_key_type' in 'field list'", antes mesmo de o
 * synchronize conseguir reconciliar o schema.
 */
async function seedAdmin(): Promise<void> {
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
  });
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                    CHAR(36)        NOT NULL PRIMARY KEY,
        email                 VARCHAR(255)    NOT NULL UNIQUE,
        password_hash         VARCHAR(255)    NOT NULL,
        name                  VARCHAR(255)    NOT NULL,
        cpf                   VARCHAR(14)     NOT NULL UNIQUE,
        phone                 VARCHAR(20)     NOT NULL,
        city                  VARCHAR(100)    NOT NULL,
        state                 VARCHAR(2)      NOT NULL,
        pix_key               VARCHAR(255)    NOT NULL,
        pix_key_type          VARCHAR(20)     NULL,
        role                  VARCHAR(20)     NOT NULL DEFAULT 'user',
        title                 VARCHAR(20)     NOT NULL DEFAULT 'none',
        partner_level         VARCHAR(20)     NOT NULL DEFAULT 'socio',
        sponsor_id            VARCHAR(36)     NULL,
        referral_code         VARCHAR(20)     NOT NULL UNIQUE,
        avatar_url            VARCHAR(500)    NULL,
        is_active             TINYINT(1)      NOT NULL DEFAULT 1,
        purchased_quotas      INT             NOT NULL DEFAULT 0,
        admin_granted_quotas  INT             NOT NULL DEFAULT 0,
        split_quotas          INT             NOT NULL DEFAULT 0,
        quota_balance         INT             NOT NULL DEFAULT 0,
        total_earnings        DECIMAL(15,2)   NOT NULL DEFAULT 0,
        last_purchase_date    DATETIME        NULL,
        created_at            DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at            DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        deleted_at            DATETIME        NULL,
        direct_count          INT             NOT NULL DEFAULT 0,
        team_count            INT             NOT NULL DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const passwordHash = await argon2.hash(admin.password);
    await conn.query(
      `INSERT INTO users
        (id, email, password_hash, name, cpf, phone, city, state, pix_key, role, referral_code, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', 'CIANO-ADMIN', 1)`,
      [
        randomUUID(),
        admin.email,
        passwordHash,
        admin.name,
        '00000000000',
        '00000000000',
        'Sistema',
        'SP',
        admin.email,
      ],
    );

    console.log(`🔑 Admin criado:`);
    console.log(`    Nome  : ${admin.name}`);
    console.log(`    E-mail: ${admin.email}`);
    console.log(`    Senha : ${admin.password}  (defina ADMIN_PASSWORD no .env para trocar)`);
  } finally {
    await conn.end();
  }
}

async function main(): Promise<void> {
  if (!(await confirm())) {
    console.log('\n❌ Cancelado. Nada foi alterado.');
    process.exit(1);
  }

  await resetSchema();
  await seedAdmin();

  console.log('\n✅ Pronto. Base zerada e admin recriado.');
  console.log('   Suba o servidor para o TypeORM recriar as demais tabelas e o seed completar.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n💥 Falha no reset:', err.message);
  process.exit(1);
});
