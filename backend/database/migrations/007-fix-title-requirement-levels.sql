-- ============================================================
-- Migration 007: Corrige os níveis de bônus em title_requirements
-- ============================================================
-- A migration 004 (versão antiga) inseria as linhas de title_requirements
-- SEM as colunas repurchase_levels / team_levels / leadership_percent,
-- deixando-as no DEFAULT 0. Com isso o BonusCalculatorService pulava
-- TODOS os bônus de recompra e de equipe (gating por nível = 0),
-- zerando os ganhos de rede de toda a base.
--
-- Esta migration reescreve os valores corretos. É idempotente: pode
-- rodar quantas vezes for necessário (UPDATE absoluto por título).
--
-- Valores conforme regras de negócio:
--   título   | repurchase_levels | team_levels | leadership_percent
--   ---------|-------------------|-------------|-------------------
--   none     | 0                 | 0           | 0
--   bronze   | 1                 | 2           | 0
--   silver   | 2                 | 3           | 0
--   gold     | 4                 | 4           | 1
--   diamond  | 6                 | 5           | 2
-- ============================================================

USE `ciano_cotas`;

SELECT 'Running migration 007: fix title_requirements levels' AS migration_info;

UPDATE `title_requirements`
   SET `repurchase_levels` = 0, `team_levels` = 0, `leadership_percent` = 0
 WHERE `title` = 'none';

UPDATE `title_requirements`
   SET `repurchase_levels` = 1, `team_levels` = 2, `leadership_percent` = 0
 WHERE `title` = 'bronze';

UPDATE `title_requirements`
   SET `repurchase_levels` = 2, `team_levels` = 3, `leadership_percent` = 0
 WHERE `title` = 'silver';

UPDATE `title_requirements`
   SET `repurchase_levels` = 4, `team_levels` = 4, `leadership_percent` = 1
 WHERE `title` = 'gold';

UPDATE `title_requirements`
   SET `repurchase_levels` = 6, `team_levels` = 5, `leadership_percent` = 2
 WHERE `title` = 'diamond';

SELECT `title`, `repurchase_levels`, `team_levels`, `leadership_percent`
FROM `title_requirements`
ORDER BY `id`;

-- Registrar migration
INSERT IGNORE INTO `migrations` (`filename`, `applied_at`, `status`)
VALUES ('007-fix-title-requirement-levels.sql', NOW(), 'applied');

SELECT 'Migration 007 concluída com sucesso.' AS migration_status;
