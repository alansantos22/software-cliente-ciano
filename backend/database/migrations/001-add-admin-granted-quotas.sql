-- ============================================================
-- Migration 001: Separar cotas concedidas pelo admin
-- ============================================================
-- Adiciona coluna admin_granted_quotas na tabela users.
-- Usa stored procedure para verificação idempotente (MySQL-compatible).
-- NÃO altera purchased_quotas nem split_quotas de registros existentes.
-- quota_balance é recalculado: purchased + admin_granted + split.
-- ============================================================

USE `ciano_cotas`;

-- ── Pre-validation ──────────────────────────────────────────
SELECT 'Running migration 001: add admin_granted_quotas' AS migration_info;

DROP PROCEDURE IF EXISTS _mig_001_add_admin_granted;
DELIMITER //
CREATE PROCEDURE _mig_001_add_admin_granted()
BEGIN
  -- Adiciona a coluna somente se não existir
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'users'
      AND COLUMN_NAME  = 'admin_granted_quotas'
  ) THEN
    ALTER TABLE users
      ADD COLUMN admin_granted_quotas INT NOT NULL DEFAULT 0
      AFTER purchased_quotas;

    SELECT 'Column admin_granted_quotas added.' AS result;
  ELSE
    SELECT 'Column admin_granted_quotas already exists — skipped.' AS result;
  END IF;

  -- Recalcula quota_balance para garantir consistência:
  -- quota_balance = purchased_quotas + admin_granted_quotas + split_quotas
  -- (admin_granted_quotas parte de 0, então o saldo não muda para dados existentes)
  UPDATE users
    SET quota_balance = purchased_quotas + admin_granted_quotas + split_quotas
  WHERE deleted_at IS NULL;

  SELECT CONCAT('quota_balance recalculado para ', ROW_COUNT(), ' usuário(s).') AS result;
END //
DELIMITER ;

CALL _mig_001_add_admin_granted();
DROP PROCEDURE IF EXISTS _mig_001_add_admin_granted;

SELECT 'Migration 001 concluída com sucesso.' AS migration_status;
