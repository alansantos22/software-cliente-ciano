/**
 * ============================================================================
 * BACKFILL ORPHAN SPONSORS — adota usuários sem patrocinador sob o admin
 * ============================================================================
 *
 * Antes da correção no cadastro, quem se registrava sem código de indicação
 * ficava com `sponsor_id = NULL`. Órfãos não geram bônus de primeira compra
 * nem de recompra, não aparecem no dashboard do admin e travam a progressão
 * de títulos da rede. Este script liga esses usuários à conta admin e ajusta
 * o `direct_count` dela.
 *
 * Por padrão roda em MODO SIMULAÇÃO (não escreve nada). Use --apply para
 * efetivar.
 *
 * Como rodar (a partir de backend/):
 *   npm run db:backfill-sponsors                  # simula
 *   npm run db:backfill-sponsors -- --apply       # aplica
 *   NODE_ENV=production npm run db:backfill-sponsors -- --apply
 * ============================================================================
 */
import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(__dirname, '..', `.env.${env}`) });

const ADMIN_REFERRAL_CODE = 'CIANO-ADMIN';
const apply = process.argv.includes('--apply');

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'ciano_cotas',
};

interface UserRow {
  id: string;
  name: string;
  email: string;
  created_at: Date;
}

async function main(): Promise<void> {
  console.log(`\n🌳 Backfill de patrocinadores — ambiente "${env}"`);
  console.log(`    Host    : ${cfg.host}:${cfg.port}`);
  console.log(`    Database: ${cfg.database}`);
  console.log(`    Modo    : ${apply ? '⚠️  APLICAR (grava no banco)' : '🔍 SIMULAÇÃO (não grava)'}\n`);

  const ds = new DataSource({
    type: 'mysql',
    ...cfg,
    entities: [],
    synchronize: false,
    charset: 'utf8mb4',
    timezone: 'Z',
  });

  await ds.initialize();

  try {
    // 1. Localiza o admin — primeiro pelo código do seed, depois pelo mais antigo.
    const adminRows: UserRow[] = await ds.query(
      `SELECT id, name, email, created_at FROM users
        WHERE referral_code = ? AND deleted_at IS NULL
        LIMIT 1`,
      [ADMIN_REFERRAL_CODE],
    );

    let admin: UserRow | undefined = adminRows[0];
    if (!admin) {
      const fallback: UserRow[] = await ds.query(
        `SELECT id, name, email, created_at FROM users
          WHERE role = 'admin' AND deleted_at IS NULL
          ORDER BY created_at ASC
          LIMIT 1`,
      );
      admin = fallback[0];
    }

    if (!admin) {
      console.log('❌ Nenhuma conta admin encontrada. Rode o seed antes deste script.');
      return;
    }

    console.log(`👤 Admin destino: ${admin.name} <${admin.email}> (${admin.id})\n`);

    // 2. Órfãos: usuários comuns ativos sem patrocinador.
    const orphans: UserRow[] = await ds.query(
      `SELECT id, name, email, created_at FROM users
        WHERE sponsor_id IS NULL
          AND role = 'user'
          AND deleted_at IS NULL
        ORDER BY created_at ASC`,
    );

    if (orphans.length === 0) {
      console.log('✅ Nenhum usuário órfão encontrado. Nada a fazer.');
      return;
    }

    console.log(`Encontrados ${orphans.length} usuário(s) sem patrocinador:`);
    for (const o of orphans) {
      console.log(`   • ${o.name} <${o.email}> — criado em ${new Date(o.created_at).toLocaleDateString('pt-BR')}`);
    }
    console.log('');

    if (!apply) {
      console.log('🔍 Simulação concluída. Rode novamente com --apply para efetivar.');
      return;
    }

    // 3. Aplica em transação: vincula os órfãos e corrige o direct_count do admin.
    await ds.transaction(async (manager) => {
      await manager.query(
        `UPDATE users SET sponsor_id = ?
          WHERE sponsor_id IS NULL AND role = 'user' AND deleted_at IS NULL`,
        [admin.id],
      );

      // Recalcula do zero em vez de somar, para não acumular execuções repetidas.
      await manager.query(
        `UPDATE users u
            SET u.direct_count = (
              SELECT COUNT(*) FROM (SELECT * FROM users) d
               WHERE d.sponsor_id = u.id AND d.deleted_at IS NULL
            )
          WHERE u.id = ?`,
        [admin.id],
      );
    });

    const [{ direct_count: directCount }]: Array<{ direct_count: number }> = await ds.query(
      `SELECT direct_count FROM users WHERE id = ?`,
      [admin.id],
    );

    console.log(`✅ ${orphans.length} usuário(s) vinculado(s) ao admin.`);
    console.log(`   direct_count do admin recalculado: ${directCount}`);
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error('\n❌ Falha no backfill:', err instanceof Error ? err.message : err);
  process.exit(1);
});
