-- ============================================================
-- Migration 008: Cria a tabela monthly_user_snapshots
-- ============================================================
-- Foto imutável do estado de cada usuário no fechamento do mês
-- (título, cotas, status e níveis de bônus). Permite que o cálculo
-- de pagamentos de um mês seja determinístico e reproduzível,
-- independente de alterações posteriores no perfil do usuário.
-- ============================================================

USE `ciano_cotas`;

SELECT 'Running migration 008: create monthly_user_snapshots' AS migration_info;

CREATE TABLE IF NOT EXISTS `monthly_user_snapshots` (
  `id`                   CHAR(36)       NOT NULL,
  `user_id`              VARCHAR(36)    NOT NULL,
  `month`                VARCHAR(7)     NOT NULL,
  `name`                 VARCHAR(255)   NOT NULL,
  `sponsor_id`           VARCHAR(36)    NULL,
  `title`                ENUM('none','bronze','silver','gold','diamond') NOT NULL,
  `partner_level`        ENUM('socio','platinum','vip','imperial') NOT NULL,
  `repurchase_levels`    INT            NOT NULL DEFAULT 0,
  `team_levels`          INT            NOT NULL DEFAULT 0,
  `leadership_percent`   DECIMAL(5,2)   NOT NULL DEFAULT 0,
  `purchased_quotas`     INT            NOT NULL DEFAULT 0,
  `admin_granted_quotas` INT            NOT NULL DEFAULT 0,
  `split_quotas`         INT            NOT NULL DEFAULT 0,
  `quota_balance`        INT            NOT NULL DEFAULT 0,
  `is_active`            TINYINT(1)     NOT NULL DEFAULT 0,
  `last_purchase_date`   DATETIME       NULL,
  `pix_key`              VARCHAR(255)   NULL,
  `pix_key_type`         ENUM('cpf','email','phone','random') NULL,
  `created_at`           DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_user_month_snapshot` (`user_id`, `month`),
  KEY `idx_snapshot_user` (`user_id`),
  KEY `idx_snapshot_month` (`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT CONCAT('monthly_user_snapshots: tabela pronta (', COUNT(*), ' registros).') AS status
FROM `monthly_user_snapshots`;

-- Registrar migration
INSERT IGNORE INTO `migrations` (`filename`, `applied_at`, `status`)
VALUES ('008-create-monthly-user-snapshots.sql', NOW(), 'applied');

SELECT 'Migration 008 concluída com sucesso.' AS migration_status;
