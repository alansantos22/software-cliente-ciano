-- ============================================================
-- Migration 006: Fix monthly_earning_summaries.cutoff_date
-- Torna a coluna cutoff_date nullable para evitar o erro
-- "Field 'cutoff_date' doesn't have a default value" que
-- ocorria quando o MonthlyCloseJob criava summaries sem
-- fornecer esse campo.
-- ============================================================

-- 1. Tornar cutoff_date nullable (caso já exista como NOT NULL)
SET @col_nullable = (
  SELECT IS_NULLABLE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'monthly_earning_summaries'
    AND COLUMN_NAME = 'cutoff_date'
);

SET @sql = IF(@col_nullable = 'NO',
  'ALTER TABLE monthly_earning_summaries MODIFY COLUMN cutoff_date DATE NULL',
  'SELECT ''cutoff_date already nullable or does not exist''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Registrar migration
INSERT IGNORE INTO migrations (filename, applied_at, status)
VALUES ('006-fix-cutoff-date-nullable.sql', NOW(), 'applied');
