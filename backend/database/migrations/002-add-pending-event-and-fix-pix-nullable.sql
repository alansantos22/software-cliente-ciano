-- =====================================================
-- Migration 002: Add pending event columns + fix pix_key_type nullable
-- Date: 2026-04-16
-- Description: Adds pending_event_type and pending_event_date to quota_system_state
--              Makes pix_key and pix_key_type nullable in payout_requests
-- =====================================================

-- ─── SECTION 1: Pre-validation ───────────────────────

-- Verify quota_system_state exists
SELECT COUNT(*) INTO @table_exists
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'quota_system_state' AND TABLE_SCHEMA = DATABASE();

-- ─── SECTION 2: Schema Changes ──────────────────────

-- 2a. Add pending_event_type to quota_system_state (if not exists)
SELECT COUNT(*) INTO @col_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'quota_system_state'
  AND COLUMN_NAME = 'pending_event_type'
  AND TABLE_SCHEMA = DATABASE();

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE quota_system_state ADD COLUMN pending_event_type ENUM(''price_increase'', ''split'') NULL DEFAULT NULL',
  'SELECT ''Column pending_event_type already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2b. Add pending_event_date to quota_system_state (if not exists)
SELECT COUNT(*) INTO @col_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'quota_system_state'
  AND COLUMN_NAME = 'pending_event_date'
  AND TABLE_SCHEMA = DATABASE();

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE quota_system_state ADD COLUMN pending_event_date DATETIME NULL DEFAULT NULL',
  'SELECT ''Column pending_event_date already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2c. Make pix_key nullable in payout_requests (if table exists)
SELECT COUNT(*) INTO @table_exists
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'payout_requests' AND TABLE_SCHEMA = DATABASE();

SET @sql = IF(@table_exists > 0,
  'ALTER TABLE payout_requests MODIFY COLUMN pix_key VARCHAR(255) NULL DEFAULT NULL',
  'SELECT ''Table payout_requests does not exist'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2d. Make pix_key_type nullable in payout_requests
SET @sql = IF(@table_exists > 0,
  'ALTER TABLE payout_requests MODIFY COLUMN pix_key_type ENUM(''cpf'', ''email'', ''phone'', ''random'') NULL DEFAULT NULL',
  'SELECT ''Table payout_requests does not exist'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ─── SECTION 3: Data Changes ────────────────────────
-- No data changes required

-- ─── SECTION 4: Register Migration ──────────────────
-- (Only if migrations table exists in your system)
