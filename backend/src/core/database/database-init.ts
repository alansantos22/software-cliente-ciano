import * as mysql from 'mysql2/promise';
import { Logger } from '@nestjs/common';

/**
 * Ensures the database exists before TypeORM tries to connect.
 * Called in main.ts bootstrap, before NestFactory.create().
 */
export async function ensureDatabaseExists(
  host: string,
  port: number,
  username: string,
  password: string,
  database: string,
): Promise<void> {
  const logger = new Logger('DatabaseInit');
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection({
      host,
      port,
      user: username,
      password,
    });

    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );

    logger.log(`✅ Database "${database}" is ready`);
  } catch (error) {
    logger.error(`❌ Failed to ensure database exists: ${(error as Error).message}`);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
