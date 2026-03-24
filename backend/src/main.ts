import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ensureDatabaseExists } from './core/database/database-init';
import * as dotenv from 'dotenv';

async function bootstrap() {
  dotenv.config({ path: '.env.development' });
  const logger = new Logger('Bootstrap');

  // Ensure the database exists before TypeORM connects
  await ensureDatabaseExists(
    process.env.DB_HOST || 'localhost',
    parseInt(process.env.DB_PORT || '3306', 10),
    process.env.DB_USERNAME || 'root',
    process.env.DB_PASSWORD || '',
    process.env.DB_DATABASE || 'ciano_cotas',
  );

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  const configService = app.get(ConfigService);

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  const corsOrigins = configService.get<string[]>('app.corsOrigins') || [
    'http://localhost:5173',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // API Prefix
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api';
  app.setGlobalPrefix(apiPrefix);

  // Start Server
  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📊 Environment: ${configService.get<string>('app.nodeEnv')}`);
}

bootstrap();
