/**
 * ============================================================================
 * DB DOCTOR — Diagnostica o schema do banco SEM alterar dados
 * ============================================================================
 *
 * Lê o .env.<NODE_ENV> (default: development) e reporta:
 *   1. Todas as tabelas que o TypeORM espera (a partir das *.entity.ts) e
 *      quais estão FALTANDO no banco real.
 *   2. As colunas que faltam em cada tabela que existe.
 *   3. O estado da senha de gerente: se a coluna existe e se há hash gravado.
 *
 * NÃO escreve nada. Seguro rodar em produção.
 *
 * Como rodar (a partir de backend/):
 *   npm run db:doctor
 *   NODE_ENV=production npm run db:doctor
 * ============================================================================
 */
import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(__dirname, '..', `.env.${env}`) });

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'ciano_cotas',
};

async function main(): Promise<void> {
  console.log(`\n🩺 DB Doctor — ambiente "${env}"`);
  console.log(`    Host    : ${cfg.host}:${cfg.port}`);
  console.log(`    Database: ${cfg.database}\n`);

  // synchronize=false: NÃO altera nada, só conecta e carrega metadata.
  const ds = new DataSource({
    type: 'mysql',
    ...cfg,
    entities: [path.resolve(__dirname, '..', 'src', '**', '*.entity.ts')],
    synchronize: false,
    charset: 'utf8mb4',
    timezone: 'Z',
  });

  await ds.initialize();

  try {
    // Tabelas reais no banco
    const realTablesRows: Array<{ TABLE_NAME: string }> = await ds.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`,
    );
    const realTables = new Set(realTablesRows.map((r) => r.TABLE_NAME.toLowerCase()));

    // Tabelas esperadas (a partir das entities)
    const expected = ds.entityMetadatas.map((m) => ({
      table: m.tableName,
      columns: m.columns.map((c) => c.databaseName),
    }));

    console.log('── TABELAS ──────────────────────────────────────────────');
    const missingTables: string[] = [];
    for (const e of expected) {
      const exists = realTables.has(e.table.toLowerCase());
      console.log(`  ${exists ? '✅' : '❌ FALTANDO'}  ${e.table}`);
      if (!exists) missingTables.push(e.table);
    }

    console.log('\n── COLUNAS FALTANDO (em tabelas que existem) ────────────');
    let anyMissingCol = false;
    for (const e of expected) {
      if (!realTables.has(e.table.toLowerCase())) continue;
      const colRows: Array<{ COLUMN_NAME: string }> = await ds.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [e.table],
      );
      const realCols = new Set(colRows.map((c) => c.COLUMN_NAME.toLowerCase()));
      const missing = e.columns.filter((c) => !realCols.has(c.toLowerCase()));
      if (missing.length) {
        anyMissingCol = true;
        console.log(`  ❌ ${e.table}: ${missing.join(', ')}`);
      }
    }
    if (!anyMissingCol) console.log('  ✅ Nenhuma coluna faltando.');

    console.log('\n── SENHA DE GERENTE ─────────────────────────────────────');
    if (!realTables.has('global_financial_settings')) {
      console.log('  ❌ Tabela global_financial_settings NÃO existe.');
    } else {
      const row: Array<{ id: number; manager_password_hash: string | null }> = await ds.query(
        `SELECT id, manager_password_hash FROM global_financial_settings WHERE id = 1`,
      );
      if (row.length === 0) {
        console.log('  ❌ Linha id=1 NÃO existe (setPassword via update() seria no-op).');
      } else {
        const hash = row[0].manager_password_hash;
        console.log(`  Linha id=1: existe ✅`);
        console.log(`  manager_password_hash: ${hash ? `gravado ✅ (${hash.slice(0, 18)}…)` : 'NULL ❌ (não configurada)'}`);
      }
    }

    console.log('\n── RESUMO ───────────────────────────────────────────────');
    if (missingTables.length) {
      console.log(`  ⚠️  ${missingTables.length} tabela(s) faltando: ${missingTables.join(', ')}`);
      console.log('     → rode "npm run db:reset" (APAGA dados) ou crie-as via migração.');
    } else {
      console.log('  ✅ Todas as tabelas esperadas existem.');
    }
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error('\n💥 Falha no diagnóstico:', err.message);
  process.exit(1);
});
