-- ============================================================
-- Migration 003: Add payout breakdown columns
-- Adds per-bonus-type breakdown + lifetime earnings to payout_requests
-- ============================================================

-- 1. first_purchase_amount
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'first_purchase_amount');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE payout_requests ADD COLUMN first_purchase_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER network_amount',
  'SELECT ''first_purchase_amount already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. repurchase_amount
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'repurchase_amount');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE payout_requests ADD COLUMN repurchase_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER first_purchase_amount',
  'SELECT ''repurchase_amount already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. team_amount
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'team_amount');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE payout_requests ADD COLUMN team_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER repurchase_amount',
  'SELECT ''team_amount already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. leadership_amount
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'leadership_amount');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE payout_requests ADD COLUMN leadership_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER team_amount',
  'SELECT ''leadership_amount already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. lifetime_earnings
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'lifetime_earnings');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE payout_requests ADD COLUMN lifetime_earnings DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER leadership_amount',
  'SELECT ''lifetime_earnings already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. Register migration
INSERT IGNORE INTO migrations (filename, applied_at) VALUES ('003-add-payout-breakdown-columns.sql', NOW());
