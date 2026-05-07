-- ============================================================
-- Migration 005: Add earnings.processed_at
-- Tracks when an earning was processed (admin generate-batch).
-- Pre-batch types (first_purchase, repurchase) keep created_at as
-- the reference; post-batch types (dividend, team, leadership)
-- now have a clear "processed at" stamp = batch generation time.
-- ============================================================

-- 1. processed_at column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'earnings' AND COLUMN_NAME = 'processed_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE earnings ADD COLUMN processed_at DATETIME NULL AFTER paid_at',
  'SELECT ''processed_at already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Index for filtering by processed month
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'earnings' AND INDEX_NAME = 'idx_earnings_processed_at');
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX idx_earnings_processed_at ON earnings(processed_at)',
  'SELECT ''idx_earnings_processed_at already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Register migration
INSERT IGNORE INTO migrations (filename, applied_at) VALUES ('005-add-earnings-processed-at.sql', NOW());
