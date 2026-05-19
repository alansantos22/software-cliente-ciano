---
name: redesign-calculo-ganhos
description: Redesign em andamento do motor de bônus/pagamentos (ganhos de rede zerados)
metadata:
  type: project
---

Redesign ativo do motor de cálculo de ganhos de rede. Diagnóstico e decisões em
`docs/ANALISE-E-PLANO-CALCULO-GANHOS.md`.

**Causa raiz dos ganhos zerados:** a migration `004-seed-title-requirements.sql` popula
`title_requirements` com `repurchase_levels`/`team_levels`/`leadership_percent = 0` (DEFAULT),
e o `SeedService` então pula o seed bom (`if count > 0 return`). Isso zera bônus de equipe e
recompra para toda a base.

**Decisões travadas (2026-05-18):**
- Lucro líquido digitado pelo admin é a fonte da verdade; `MonthlyCloseJob` não calcula mais
  dividendos/equipe/liderança.
- Dividendo = 20% do lucro, distribuído por fração de cotas.
- Bônus de equipe/liderança = **cascata**: 2% de tudo (inclui equipe/liderança dos downlines) →
  exige travessia leaf-up.
- Snapshot mensal de título/cotas/status para cálculo determinístico.
- Pagamentos viram "a receber" ao gerar lote; "recebido" ao concluir.
- Regra 10%/5% do bônus de primeira compra é intencional (sem mudança).

**Status (2026-05-18):** redesign do backend implementado — migrations 004/007,
SeedService auto-corretivo, snapshot mensal (`monthly_user_snapshots` + migration 008),
`BonusCalculatorService` em cascata leaf-up lendo do snapshot, `voidBatch` + validações.
Pendente: tela "a receber" no frontend; spec obsoleto `earnings.service.spec.ts`.
Detalhes e checklist na seção 6 do documento.
