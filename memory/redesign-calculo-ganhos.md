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

**Correção (2026-05-27):** o `snapshot.quotaBalance` estava sendo gravado a partir
do `user.quotaBalance` ATUAL no momento da captura — não refletia o saldo de fim
do mês. Resultado: meses cujo snapshot foi criado tarde (via fallback em
`ensureSnapshot`) inflavam cotas com compras futuras; meses cujo snapshot
rodou cedo perdiam compras posteriores. Mesmo cotista aparecia com cotas
diferentes em meses diferentes.
Fix: `SnapshotService.getHistoricalQuotaBalances(month)` reconstrói o saldo a
partir de `quota_transactions` + `split_events` em ordem cronológica até o fim
do mês. `calculateDistribution`, `calculateDividends` e `previewBatchAmounts`
agora leem desse método (não mais de `snap.quotaBalance`); `captureMonth` grava
o saldo correto. Snapshots antigos com `quotaBalance` errado deixaram de
afetar o cálculo. Bug colateral fixado: `simulatePurchase` em
`AdminManagerService` não somava `adminGrantedQuotas` ao recalcular o
`quotaBalance` do usuário (zerava cotas concedidas pelo admin).

**Regra base equipe/liderança (2026-05-30):** o bônus de equipe/liderança incide
sobre o que o downline VAI RECEBER no mesmo mês em que esse bônus é pago — não
sobre o que foi calculado no mês de competência. Como bônus de rede pagam ref+1 e
dividendos pagam ref+2 (migration 010 / `computePaymentMonths`), a base do bônus
de competência M (pago em M+1) = bônus de M (compra/recompra/equipe/liderança) +
dividendos de **M-1**. Os dividendos do próprio M (pagam M+2) NÃO entram — vão
para a base do mês seguinte. Implementado em `BonusCalculatorService.sumEarnings`
(caminho persistido) e no `sumFor`/`prevDividendByUser` de `previewBatchAmounts`
(preview). Antes a base usava TODOS os ganhos do mesmo mês M, incluindo o
dividendo de M — equívoco corrigido após separação das datas de pagamento.

**Bug do snapshot raso — equipe/liderança "parando no 1º nível" (fix 2026-05-30):**
`SnapshotService.captureMonth` era idempotente puro (pula se já há linhas). No Modo
de testes (gerando lote de mês futuro/aberto), o snapshot era congelado na 1ª prévia
e nunca mais atualizava; downlines de nível 2+ adicionados depois ficavam de fora da
árvore congelada, e a travessia `collectDownlineIds` (que está correta — testada até
4 níveis) só enxergava o nível 1. NÃO era bug do algoritmo nem da regra (base =
ganhos dos patrocinados, profundidade por título: bronze 2 / prata 3 / ouro 4 /
diamante 5). Fix: `captureMonth(month, { force })` apaga+recaptura; `AdminService`
recaptura (force) em `calculateDistribution` e `generateBatch` **SOMENTE no Modo de
testes** (flag `allowFutureMonth`, o checkbox do frontend). Em produção o snapshot é
IMUTÁVEL — congelado no fim do mês pelo `MonthlyCloseJob` — para não pagar quem não
tinha cota no mês nem dar bônus indevido (decisão do cliente 2026-05-30). A flag
`allowFutureMonth` agora também trafega no DTO/endpoint de `calculate-distribution`.
Testes: `snapshot.service.spec.ts`.

**Profundidade de liderança SEM compressão (confirmado pelo cliente 2026-05-30):**
o bônus de liderança conta os qualificados (ouro/diamante) dentro de **5 camadas
ESTRUTURAIS** abaixo do líder — desce nível a nível como numa árvore, NUNCA
comprime (não pula bronze/prata para alcançar um qualificado mais fundo). Ex.: um
diamante na 6ª camada estrutural fica de fora, mesmo que seja o 1º qualificado da
linha. Implementado via `collectDownlineIds` (BFS camada a camada, `LEADERSHIP_DEPTH=5`)
+ filtro de título ouro/diamante. Seed (migration 004): leadership_percent
ouro=1%, diamante=2%, bronze/prata=0 (só ouro/diamante recebem). Idem o bônus de
equipe usa profundidade estrutural por título (bronze 2 / prata 3 / ouro 4 / diamante 5).
