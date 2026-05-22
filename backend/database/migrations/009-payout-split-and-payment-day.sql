-- ============================================================
-- Migration 009: Split de pagamento (bônus/dividendos) + payment_day=15
-- ============================================================
-- Mudanças solicitadas pelo cliente em 2026-05:
--   1. O dia padrão de pagamento aos cotistas é 15 (e não 5).
--   2. O admin precisa pagar os bônus e os dividendos como ações
--      separadas — cada PayoutRequest passa a ter dois marcadores
--      independentes (`bonus_paid_at` e `dividend_paid_at`). O status
--      COMPLETED é atingido apenas quando ambos estão preenchidos.
--
-- Idempotente: usa ADD COLUMN IF NOT EXISTS quando suportado, e UPDATE
-- absoluto para o payment_day.
-- ============================================================

USE `ciano_cotas`;

SELECT 'Running migration 009: payout split + payment_day' AS migration_info;

-- 1) Novo dia padrão de pagamento (somente se a linha 1 existir e ainda
--    estiver no valor antigo 5 — não sobrescrevemos configurações já
--    customizadas pelo admin).
UPDATE `global_financial_settings`
   SET `payment_day` = 15
 WHERE `id` = 1
   AND `payment_day` = 5;

-- Atualiza também o DEFAULT da coluna para futuros inserts.
ALTER TABLE `global_financial_settings`
  MODIFY COLUMN `payment_day` INT NOT NULL DEFAULT 15;

-- 2) Colunas de pagamento separado em payout_requests
SET @col_bonus := (
  SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'payout_requests'
     AND column_name = 'bonus_paid_at'
);
SET @sql := IF(@col_bonus = 0,
  'ALTER TABLE `payout_requests` ADD COLUMN `bonus_paid_at` DATETIME NULL AFTER `completed_at`',
  'SELECT "bonus_paid_at já existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_div := (
  SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'payout_requests'
     AND column_name = 'dividend_paid_at'
);
SET @sql := IF(@col_div = 0,
  'ALTER TABLE `payout_requests` ADD COLUMN `dividend_paid_at` DATETIME NULL AFTER `bonus_paid_at`',
  'SELECT "dividend_paid_at já existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Backfill: pagamentos legados COMPLETED valem como "tudo pago"
UPDATE `payout_requests`
   SET `bonus_paid_at`    = COALESCE(`bonus_paid_at`,    `completed_at`),
       `dividend_paid_at` = COALESCE(`dividend_paid_at`, `completed_at`)
 WHERE `status` = 'completed';

-- Registrar migration
INSERT IGNORE INTO `migrations` (`filename`, `applied_at`, `status`)
VALUES ('009-payout-split-and-payment-day.sql', NOW(), 'applied');

SELECT 'Migration 009 concluída com sucesso.' AS migration_status;
