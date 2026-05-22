-- ============================================================
-- Migration 010: Datas de pagamento separadas para bônus e dividendos
-- ============================================================
-- Regra de negócio (cliente, 2026-05):
--   • Bônus de rede (compra, recompra, equipe, liderança) são pagos
--     no mês seguinte ao mês de competência (ref+1).
--   • Dividendos (cotas) são pagos dois meses após o mês de competência
--     (ref+2).
--   Antes esta migration, ambos compartilhavam o mesmo `payment_month`
--   (ref+2) — o que adiantava o dinheiro do dividendo correto mas
--   atrasava em 1 mês o repasse dos bônus de rede.
--
-- Cada PayoutRequest passa a guardar as duas datas. A coluna legada
-- `payment_month` continua existindo (= MAX entre as duas) para não
-- quebrar leituras antigas que ainda olham para ela.
--
-- Idempotente: usa ADD COLUMN IF NOT EXISTS via information_schema.
-- ============================================================

USE `ciano_cotas`;

SELECT 'Running migration 010: split bonus/dividend payment_month' AS migration_info;

-- 1) Coluna bonus_payment_month
SET @col_bonus_pm := (
  SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'payout_requests'
     AND column_name = 'bonus_payment_month'
);
SET @sql := IF(@col_bonus_pm = 0,
  'ALTER TABLE `payout_requests` ADD COLUMN `bonus_payment_month` VARCHAR(7) NULL AFTER `payment_month`',
  'SELECT "bonus_payment_month já existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Coluna dividend_payment_month
SET @col_div_pm := (
  SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'payout_requests'
     AND column_name = 'dividend_payment_month'
);
SET @sql := IF(@col_div_pm = 0,
  'ALTER TABLE `payout_requests` ADD COLUMN `dividend_payment_month` VARCHAR(7) NULL AFTER `bonus_payment_month`',
  'SELECT "dividend_payment_month já existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Índices para os filtros do dashboard (próximo pagamento por tipo)
SET @idx_bonus := (
  SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = DATABASE()
     AND table_name = 'payout_requests'
     AND index_name = 'idx_payout_bonus_pay_month'
);
SET @sql := IF(@idx_bonus = 0,
  'CREATE INDEX `idx_payout_bonus_pay_month` ON `payout_requests` (`bonus_payment_month`)',
  'SELECT "idx_payout_bonus_pay_month já existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_div := (
  SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = DATABASE()
     AND table_name = 'payout_requests'
     AND index_name = 'idx_payout_dividend_pay_month'
);
SET @sql := IF(@idx_div = 0,
  'CREATE INDEX `idx_payout_dividend_pay_month` ON `payout_requests` (`dividend_payment_month`)',
  'SELECT "idx_payout_dividend_pay_month já existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) Backfill dos lotes existentes
--    Lotes legados foram criados quando bônus e dividendos compartilhavam
--    a mesma data (ref+2). Para preservar a foto da emissão antiga, deixamos
--    ambos os campos iguais ao payment_month gravado. Novos lotes (após
--    esta migration) é que vão preencher cada um corretamente.
UPDATE `payout_requests`
   SET `bonus_payment_month`    = COALESCE(`bonus_payment_month`,    `payment_month`),
       `dividend_payment_month` = COALESCE(`dividend_payment_month`, `payment_month`)
 WHERE `bonus_payment_month` IS NULL
    OR `dividend_payment_month` IS NULL;

-- Registrar migration
INSERT IGNORE INTO `migrations` (`filename`, `applied_at`, `status`)
VALUES ('010-split-bonus-dividend-payment-month.sql', NOW(), 'applied');

SELECT 'Migration 010 concluída com sucesso.' AS migration_status;
