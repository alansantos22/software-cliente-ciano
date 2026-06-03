-- ============================================================
-- Migration 011: Campos de gateway de pagamento em quota_transactions
-- ============================================================
-- Integração PagBank/PagSeguro (Checkout API, modo redirect) para a
-- COMPRA de cotas. A partir daqui a transação nasce como
-- 'waiting_payment' e só vira 'completed' quando o webhook do PagBank
-- confirma o pagamento (status PAID). As colunas novas guardam os
-- identificadores do gateway e a URL de pagamento (link de redirect).
--
-- Também amplia o ENUM de status para cobrir o ciclo de vida do
-- pagamento: waiting_payment / declined / expired.
--
-- Idempotente: usa checagem em information_schema antes de cada ADD.
-- ============================================================

USE `ciano_cotas`;

SELECT 'Running migration 011: quota_transactions gateway fields' AS migration_info;

-- 1) Ampliar o ENUM de status (preserva os valores existentes)
ALTER TABLE `quota_transactions`
  MODIFY COLUMN `status`
  ENUM('pending','waiting_payment','completed','declined','expired','cancelled')
  NOT NULL DEFAULT 'pending';

-- 2) gateway (nome do provedor, ex: 'pagbank')
SET @col := (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'quota_transactions' AND column_name = 'gateway');
SET @sql := IF(@col = 0,
  'ALTER TABLE `quota_transactions` ADD COLUMN `gateway` VARCHAR(20) NULL AFTER `status`',
  'SELECT "gateway já existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) gateway_checkout_id (id do checkout retornado pelo PagBank)
SET @col := (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'quota_transactions' AND column_name = 'gateway_checkout_id');
SET @sql := IF(@col = 0,
  'ALTER TABLE `quota_transactions` ADD COLUMN `gateway_checkout_id` VARCHAR(64) NULL AFTER `gateway`',
  'SELECT "gateway_checkout_id já existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) gateway_order_id (id do pedido/charge na confirmação do pagamento)
SET @col := (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'quota_transactions' AND column_name = 'gateway_order_id');
SET @sql := IF(@col = 0,
  'ALTER TABLE `quota_transactions` ADD COLUMN `gateway_order_id` VARCHAR(64) NULL AFTER `gateway_checkout_id`',
  'SELECT "gateway_order_id já existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5) payment_url (link de redirect rel=PAY do PagBank)
SET @col := (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'quota_transactions' AND column_name = 'payment_url');
SET @sql := IF(@col = 0,
  'ALTER TABLE `quota_transactions` ADD COLUMN `payment_url` VARCHAR(500) NULL AFTER `gateway_order_id`',
  'SELECT "payment_url já existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6) paid_at (timestamp em que o pagamento foi confirmado)
SET @col := (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'quota_transactions' AND column_name = 'paid_at');
SET @sql := IF(@col = 0,
  'ALTER TABLE `quota_transactions` ADD COLUMN `paid_at` DATETIME NULL AFTER `completed_at`',
  'SELECT "paid_at já existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7) Índice para lookup por checkout id (usado pelo webhook como fallback)
SET @idx := (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'quota_transactions' AND index_name = 'idx_quota_txn_checkout');
SET @sql := IF(@idx = 0,
  'CREATE INDEX `idx_quota_txn_checkout` ON `quota_transactions` (`gateway_checkout_id`)',
  'SELECT "idx_quota_txn_checkout já existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Registrar migration
INSERT IGNORE INTO `migrations` (`filename`, `applied_at`, `status`)
VALUES ('011-quota-transaction-gateway-fields.sql', NOW(), 'applied');

SELECT 'Migration 011 concluída com sucesso.' AS migration_status;
