-- ============================================================
-- Migration 004: Seed title_requirements
-- ============================================================
-- Insere os requisitos padrão de títulos caso a tabela esteja vazia.
-- Usa INSERT IGNORE para idempotência (não falha se já existir).
-- Requisitos conforme regras de negócio:
--   Bronze  → 2 pessoas ativas na rede direta
--   Prata   → 1 indicado direto com título >= Bronze
--   Ouro    → 2 Bronzes em linhas diretas diferentes
--   Diamante→ 3 Bronzes em linhas diretas diferentes
-- ============================================================

USE `ciano_cotas`;

SELECT 'Running migration 004: seed title_requirements' AS migration_info;

-- Cria tabela caso não exista (segurança — TypeORM normalmente cria via sync)
CREATE TABLE IF NOT EXISTS `title_requirements` (
  `id`                   INT            NOT NULL AUTO_INCREMENT,
  `title`                ENUM('none','bronze','silver','gold','diamond') NOT NULL,
  `requirement_desc`     VARCHAR(500)   NOT NULL,
  `req_type`             ENUM('pessoas_ativas','indicado','linhas') NULL,
  `req_quantity`         INT            NULL,
  `req_level`            ENUM('qualquer','bronze','prata','ouro') NULL,
  `repurchase_levels`    INT            NOT NULL DEFAULT 0,
  `team_levels`          INT            NOT NULL DEFAULT 0,
  `leadership_percent`   DECIMAL(5,2)   NOT NULL DEFAULT 0,
  `min_network_movement` DECIMAL(15,2)  NULL,
  `network_levels_depth` INT            NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_title_requirements_title` (`title`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed dos requisitos — INSERT IGNORE garante idempotência
INSERT IGNORE INTO `title_requirements`
  (`title`, `requirement_desc`, `req_type`, `req_quantity`, `req_level`)
VALUES
  ('none',    'Sem requisito',                                     NULL,             NULL, NULL    ),
  ('bronze',  'Ter 2 pessoas ativas na rede direta',               'pessoas_ativas', 2,    NULL    ),
  ('silver',  'Ter 1 indicado direto ativo com título Bronze',     'indicado',       1,    'bronze'),
  ('gold',    '2 indicados Bronze em linhas diretas diferentes',   'linhas',         2,    'bronze'),
  ('diamond', '3 indicados Bronze em linhas diretas diferentes',   'linhas',         3,    'bronze');

SELECT CONCAT('title_requirements: ', COUNT(*), ' registro(s) presentes.') AS seed_status
FROM `title_requirements`;

-- Registrar migration
INSERT IGNORE INTO `migrations` (`filename`, `status`, `applied_at`)
VALUES ('004-seed-title-requirements.sql', 'completed', NOW());

SELECT 'Migration 004 concluída com sucesso.' AS migration_status;
