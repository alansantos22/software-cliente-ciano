# Sistema de Pagamentos — Diagnóstico e Funcionamento

> Documento dividido em duas partes:
> - **Parte 1** — Explicação em linguagem simples para o cliente.
> - **Parte 2** — Diagnóstico técnico detalhado e riscos identificados.

---

## PARTE 1 — Como o sistema funciona (versão para o cliente)

Esta seção explica, em linguagem do dia a dia, **o que o sistema faz a cada clique** do administrador na tela de pagamentos. Foi pensada para ser lida sem conhecimento técnico.

---

### 1. O que acontece depois que o administrador informa o "Lucro Líquido"

O administrador entra na tela **"Fechamento de Folha de Pagamento"** e preenche três informações:

- **Mês de Competência** — qual mês está sendo fechado (ex: "Março de 2026").
- **Lucro Líquido** — quanto a empresa lucrou naquele mês.
- O sistema mostra automaticamente o **Mês de Pagamento**, que é sempre **dois meses depois** da competência (regra do contrato dos cotistas).

Ao clicar em **"Ver Distribuição Calculada"**, o sistema faz uma **prévia** (ainda **sem gravar nada**) com os seguintes passos:

1. **Calcula a pool de dividendos**: pega o lucro líquido informado e separa o percentual configurado (padrão: 20%) para distribuir entre os cotistas.

   > Exemplo: Lucro de R$ 100.000 → R$ 20.000 vão para a caixa de dividendos.

2. **Lê a "foto do mês"**: para garantir que os cálculos sejam justos e estáveis, o sistema usa uma fotografia (snapshot) do estado dos cotistas no fechamento do mês — quem tinha quantas cotas, qual era o título de cada um, quem estava ativo.

3. **Distribui os dividendos proporcionalmente às cotas**: quem tinha 10% das cotas no fechamento, recebe 10% da pool.

4. **Calcula os bônus da rede** (equipe e liderança) baseado nos ganhos do mês — em memória, só para mostrar uma prévia.

5. **Exibe a tabela completa** com:
   - Nome do cotista
   - Quantidade de cotas
   - Percentual da pool
   - Valor total a receber (dividendos + bônus)
   - Chave PIX

> **Importante**: nada é gravado nessa etapa. É só uma simulação para o administrador conferir os valores **antes** de aprovar.

---

### 2. O que acontece depois que o administrador clica em "Aprovar Lote e Gerar Faturas"

Esta é a **etapa que efetivamente registra os pagamentos** no sistema. Ao clicar, o sistema:

1. **Bloqueia duplicatas**: se já existe um lote daquele mês, o sistema avisa e impede gerar de novo (evita pagar duas vezes).

2. **Calcula e grava os bônus na ordem correta**:
   - Primeiro os **dividendos** (proporcional às cotas).
   - Depois o **bônus de equipe** (2% do que a rede vai receber naquele mês de pagamento).
   - Por último o **bônus de liderança** (percentual sobre o que os qualificados recebem naquele mês).

3. **Aplica validações automáticas de segurança** — o sistema só deixa avançar se:
   - O lucro líquido informado não é negativo.
   - Nenhum pagamento ficou com valor negativo (sinal de erro de cálculo).
   - O total a pagar não é absurdamente maior que o lucro informado.
   - Avisa (sem bloquear) quando há pagamentos muito acima da média, ou cotistas sem chave PIX cadastrada.

4. **Gera uma "fatura" (PayoutRequest) para cada cotista** com o detalhamento separado:
   - Quanto é de dividendo
   - Quanto é de bônus de 1ª compra
   - Quanto é de bônus de recompra
   - Quanto é de bônus de equipe
   - Quanto é de bônus de liderança
   - Total

5. **Move o lote para a Etapa 3 (Execução de Pagamentos)** — onde aparece a lista de todos os cotistas a serem pagos.

> A partir deste ponto, os valores **estão congelados no banco** e a única forma de mudar é **anular o lote** (operação que só é permitida se nenhum pagamento já foi processado).

---

### 3. O que acontece quando o administrador clica em "Processar" ou marca como "Pago"

Cada cotista da lista tem botões que controlam o fluxo de pagamento. **A grande mudança recente foi separar o pagamento em dois trilhos**: o administrador pode pagar **só os bônus** ou **só os dividendos** independentemente.

**Botão "Processar"** (status muda para "Processando"):
- Marca que o administrador começou a executar aquele pagamento no banco.
- A partir daí, os botões de "Pagar Bônus" e "Pagar Dividendos" ficam visíveis.

**Botão "Pagar Bônus"**:
- Aparece **somente se houver valor de bônus a pagar** (compra, recompra, equipe ou liderança).
- Quando clicado, registra que **a parte de bônus foi paga** (data e hora).
- Marca todos os bônus daquele cotista como "Pagos" no extrato.

**Botão "Pagar Dividendos"**:
- Aparece **somente se houver dividendo a pagar**.
- Registra que **a parte de dividendos foi paga**.
- Marca o dividendo como "Pago" no extrato.

**Status "Pago" (completed)** — só acontece quando:
- Os dois trilhos (bônus + dividendos) foram marcados como pagos, OU
- Um dos lados é zero (ex: cotista sem rede só recebe dividendo) e o outro foi pago.

**Botão "Confirmar todos"**:
- Atalho que pega todos os pagamentos "em processamento" e marca como totalmente pagos de uma vez.

> Resumo: o sistema agora permite pagar bônus e dividendos em **dias diferentes**, se o administrador quiser, e o cotista vê em tempo real qual parte já foi liquidada.

---

### 4. Como os bônus são calculados

O sistema tem **5 tipos de bônus**, cada um com uma regra clara. Dois deles são **automáticos no momento da compra**; os outros três só são calculados quando o administrador fecha a folha.

#### 4.1 — Bônus de Primeira Compra (automático)

- **Quando**: assim que um novo cotista faz a primeira compra de cotas.
- **Quem recebe**: o patrocinador direto.
- **Quanto**:
  - **10%** sobre o valor da compra, **se o patrocinador tem cotas**.
  - **5%** sobre o valor da compra, **se o patrocinador não tem cotas**.
  - (Regra que incentiva o patrocinador a comprar cotas também.)

> Exemplo: João é patrocinador (tem cotas). Maria, indicada por ele, compra R$ 2.000 em cotas. João recebe R$ 200 de bônus de primeira compra.

#### 4.2 — Bônus de Recompra (automático)

- **Quando**: em **toda compra subsequente** (a partir da 2ª) de um cotista.
- **Quem recebe**: até **6 níveis de patrocinadores acima** (linha ascendente).
- **Quanto**:
  - **5%** no nível 1 (patrocinador direto).
  - **2%** nos níveis 2 a 6.
- **Condições obrigatórias para cada nível receber**:
  - O patrocinador daquele nível precisa estar **ativo** (ter comprado nos últimos 6 meses).
  - O **título** dele precisa desbloquear aquele nível (ex: um Bronze só recebe até nível X, um Ouro recebe mais níveis).
- **Se o cotista de um nível está inativo, ele é pulado** (a comissão dele se perde — não passa para frente).

#### 4.3 — Bônus de Dividendos (no fechamento do mês)

- **Quando**: quando o administrador fecha a folha com o lucro líquido.
- **Quem recebe**: **todos os cotistas que têm cotas**, ativos ou não.
- **Quanto**: proporcional. Total da pool = `Lucro Líquido × 20%` (configurável). Cada um recebe `(pool / total de cotas no sistema) × quantidade de cotas que possui`.

> Exemplo: Pool de R$ 20.000, total de 200 cotas no sistema. Cotista com 10 cotas recebe (20.000 / 200) × 10 = R$ 1.000.

#### 4.4 — Bônus de Equipe (no fechamento do mês)

- **Quando**: junto com o fechamento da folha, depois dos dividendos.
- **Quem recebe**: cotistas **ativos** com pelo menos 1 nível de equipe desbloqueado pelo título.
- **Quanto**: **2% de TUDO** que a rede abaixo dele **vai receber no mesmo mês** em que esse bônus é pago, em todos os tipos de bônus — compra, recompra, dividendos, e até os próprios bônus de equipe/liderança dos cotistas abaixo (efeito cascata). Como bônus pagam ref+1 e dividendos ref+2, a base do bônus de competência M (pago em M+1) = bônus de **M** + dividendos de **M-1** (os dividendos do próprio M só pagam em M+2 e entram na base do mês seguinte).
- **Profundidade**: depende do título (definido na tabela de carreira). Ouro vê N níveis, Diamante vê mais, e assim por diante.

> A regra de cascata é o que faz esse bônus crescer: a equipe ganha 2% do que TODOS os de baixo vão receber naquele mês, somando os bônus que eles próprios já receberam.
> Importante: o bônus incide sobre o que o cotista **recebe** no mês (regra do cliente, 2026-05), não sobre o que foi calculado no mês de competência — por isso os dividendos da base são os do mês anterior.

#### 4.5 — Bônus de Liderança (no fechamento do mês)

- **Quando**: junto com o bônus de equipe.
- **Quem recebe**: cotistas **ativos** que têm um percentual de liderança no título (geralmente Ouro e Diamante).
- **Quanto**: `percentualDeLiderança × o que os qualificados da rede recebem naquele mês` (mesma base de mês de pagamento da equipe: bônus de M + dividendos de M-1).
- **Quem entra na base**: **apenas downlines qualificados** (com título **Ouro** ou **Diamante**) até **5 níveis** de profundidade. Cotistas Bronze e Prata da rede não contam para essa conta.

#### Tabela-resumo

| Bônus | Quando paga | Quem recebe | Base de cálculo |
|---|---|---|---|
| Primeira Compra | Imediato | Patrocinador direto | 10% ou 5% da compra |
| Recompra | Imediato | Até 6 níveis acima | 5% (N1) ou 2% (N2-N6) |
| Dividendos | Fechamento | Todos com cota | Proporcional ao número de cotas |
| Equipe | Fechamento | Ativos com título | 2% do que a rede recebe no mês (bônus de M + dividendos de M-1) |
| Liderança | Fechamento | Ativos Ouro/Diamante | % do que os qualificados recebem no mês |

#### Regras gerais importantes (resumo)

- **Conta inativa** = não comprou nos últimos 6 meses. Esses cotistas perdem o título, **não recebem** Recompra, Equipe nem Liderança. Continuam recebendo apenas Dividendos (se ainda tiverem cotas).
- **Os bônus de Compra e Recompra são gerados na hora da compra** — você consegue ver no extrato do cotista no momento em que ele compra. Os outros três (Dividendos, Equipe, Liderança) **dependem do administrador fechar a folha**.
- **A ordem do cálculo é fixa**: Dividendos → Equipe → Liderança. A base de Equipe/Liderança usa os dividendos do **mês anterior** (M-1, já fechados) — não os de M — porque o bônus incide sobre o que a rede recebe no mês de pagamento. O cálculo dos dividendos de M antes da equipe é mantido apenas por organização do fechamento; a equipe não depende deles.

---

## PARTE 2 — Diagnóstico técnico

Esta seção é interna (equipe de desenvolvimento) e descreve o estado real do código, os arquivos envolvidos, e os pontos de risco que provavelmente ainda vão estourar mesmo após as correções recentes.

### 2.1 — Mapa do fluxo no código

| Etapa | Endpoint | Handler |
|---|---|---|
| Preview de distribuição | `POST /admin/payouts/calculate-distribution` | [admin.service.ts:247-360](../backend/src/modules/admin/admin.service.ts#L247-L360) |
| Gerar lote | `POST /admin/payouts/generate-batch` | [admin.service.ts:362-459](../backend/src/modules/admin/admin.service.ts#L362-L459) |
| Anular lote | `DELETE /admin/payouts/batch/:month` | [admin.service.ts:546-607](../backend/src/modules/admin/admin.service.ts#L546-L607) |
| Processar pagamento | `PATCH /admin/payouts/:id/process` | [admin.service.ts:644-688](../backend/src/modules/admin/admin.service.ts#L644-L688) |
| Pagar bônus | `PATCH /admin/payouts/:id/pay-bonus` | idem (action `pay-bonus`) |
| Pagar dividendos | `PATCH /admin/payouts/:id/pay-dividend` | idem (action `pay-dividend`) |
| Bulk confirmar | `POST /admin/payouts/bulk-action` | idem |

Cálculo dos bônus: [bonus-calculator.service.ts](../backend/src/core/bonus/bonus-calculator.service.ts).

### 2.2 — Ordem obrigatória da cascata (em `generateBatch`)

1. `existing` check — bloqueia se já existe lote para o mês.
2. `snapshotService.captureMonth(profitMonth)` — idempotente.
3. `bonusCalc.calculateDividends(profitMonth, dividendPool)`.
4. `bonusCalc.calculateTeamAndLeadershipBonuses(profitMonth)`.
5. `UPDATE earnings SET processed_at = NOW()` para o mês.
6. `calculateDistribution(...)` (agora com dados persistidos).
7. `validateBatch(...)` — erros bloqueiam, warnings liberam.
8. Cria os `PayoutRequest` em massa.

> Nota (2026-05-30): no passo 4, a base de equipe/liderança são os recebíveis que caem no mês de pagamento do bônus (M+1) — bônus de M + dividendos de **M-1** (já persistidos). Os dividendos de M calculados no passo 3 servem para o trilho de dividendos (pagam M+2), **não** para a base da equipe. Ver `BonusCalculatorService.sumEarnings`.

### 2.3 — Modelo de dados crítico

`payout_requests` ([payout-request.entity.ts](../backend/src/modules/payouts/entities/payout-request.entity.ts)) agora tem:

- `quota_amount` — total de dividendos
- `network_amount` — total de bônus de rede
- `first_purchase_amount`, `repurchase_amount`, `team_amount`, `leadership_amount` — breakdown
- `bonus_paid_at`, `dividend_paid_at` — **trilhos independentes de pagamento** (migration 009)
- `completed_at` — só preenchido quando ambos os trilhos foram pagos

### 2.4 — Riscos remanescentes (em ordem de probabilidade)

#### RISCO 1 — Migration 009 não aplicada em produção

A migration [009-payout-split-and-payment-day.sql](../backend/database/migrations/009-payout-split-and-payment-day.sql) adiciona as colunas `bonus_paid_at` e `dividend_paid_at`. Todo o código novo lê/escreve nelas. Se ela **não rodou na VPS**, tudo o que diz respeito a "Pagar Bônus" e "Pagar Dividendos" vai falhar silenciosamente.

**Verificação**: rodar no banco da VPS:

```sql
SHOW COLUMNS FROM payout_requests LIKE 'bonus_paid_at';
SHOW COLUMNS FROM payout_requests LIKE 'dividend_paid_at';
SELECT * FROM migrations WHERE filename = '009-payout-split-and-payment-day.sql';
```

#### RISCO 2 — Snapshot do mês congelado errado

`ensureSnapshot` em [bonus-calculator.service.ts:59-69](../backend/src/core/bonus/bonus-calculator.service.ts#L59-L69) **só captura se não existir snapshot**. Se o `MonthlyCloseJob` rodou antes de os títulos serem recalculados (ou em momento ruim), o snapshot guarda `teamLevels=0` e `leadershipPercent=0` para todos — e **não há endpoint para regerar**.

`voidBatch` ([admin.service.ts:546-607](../backend/src/modules/admin/admin.service.ts#L546-L607)) **preserva o snapshot de propósito** (regerar o lote deve usar a mesma foto). Resultado: lote regerado com snapshot ruim → mesma falha.

**Mitigação proposta**: adicionar endpoint admin para forçar regeração do snapshot de um mês específico (`DELETE /admin/snapshots/:month` seguido de recálculo de títulos).

#### RISCO 3 — Tabela principal esconde o breakdown

[AdminPayoutsView.vue:517-524](../frontend/src/features/admin/views/AdminPayoutsView.vue#L517-L524) lista apenas `Cotista, Valor, Competência, Pagamento em, Status, Ações`. Compra/recompra/equipe/liderança só são visíveis no modal de detalhes — provavelmente é a origem da queixa "compra e recompra não aparecem mais".

**Mitigação proposta**: adicionar colunas opcionais (ou um expandable row) com o breakdown direto na tabela.

#### RISCO 4 — Skip silencioso na cascata

`calculateDividends` ([bonus-calculator.service.ts:181-187](../backend/src/core/bonus/bonus-calculator.service.ts#L181-L187)) e `calculateTeamAndLeadershipBonuses` ([bonus-calculator.service.ts:233-243](../backend/src/core/bonus/bonus-calculator.service.ts#L233-L243)) **pulam o cálculo** se já houver earnings daquele tipo no mês. Se houve teste/rascunho anterior, a cascata vai pular sem aviso. `voidBatch` deleta DIVIDEND/TEAM/LEADERSHIP, então funciona — mas é responsabilidade do admin lembrar de anular antes de regerar.

**Mitigação proposta**: o log de skip deveria virar um warning visível no response da API (não só no logger).

#### RISCO 5 — Botões somem quando o valor é zero

[AdminPayoutsView.vue:285](../frontend/src/features/admin/views/AdminPayoutsView.vue#L285): `v-if="Number(row.networkAmount ?? 0) > 0 && !row.bonusPaidAt"`. Se a cascata calculou 0 (porque o cotista não tem downlines ativos, ou o snapshot está zerado), o botão "Pagar Bônus" some — visualmente parece bug, mas é o comportamento correto.

**Mitigação proposta**: mostrar o botão desabilitado com tooltip "Sem bônus a pagar neste mês" em vez de esconder.

#### RISCO 6 — `isFirstPurchase` depende de estado do usuário

[quotas.service.ts:127-131](../backend/src/modules/quotas/quotas.service.ts#L127-L131) decide o disparo do bônus baseado em `isFirstPurchase`. Se cotas forem adicionadas pelo admin manualmente sem incrementar `purchasedQuotas` corretamente, a 1ª compra do usuário nunca vai disparar FIRST_PURCHASE — vai cair direto em REPURCHASE.

**Verificação**: revisar [admin-manager.service.ts:263-265](../backend/src/modules/admin/admin-manager.service.ts#L263-L265) onde o admin pode gerar compras manualmente.

#### RISCO 7 — Regra "ativo = 6 meses" exclui base grande

Hoje (20/05/2026), todo cotista que não comprou desde **20/11/2025** está inativo. Como inativo perde título → perde REPURCHASE/TEAM/LEADERSHIP. Em uma base com muitos antigos, isso zera a maior parte dos bônus de rede com o sistema "funcionando corretamente".

**Mitigação**: não é bug — mas vale validar com o cliente se a regra de 6 meses está alinhada às expectativas.

### 2.5 — Checklist de verificação na VPS

Recomendação de ordem para diagnosticar se as correções "surtiram efeito":

1. **Confirmar migration 009 aplicada**: `SELECT * FROM migrations WHERE filename LIKE '009%';`
2. **Inspecionar snapshots**:
   ```sql
   SELECT reference_month, COUNT(*) AS total,
          SUM(CASE WHEN team_levels > 0 THEN 1 ELSE 0 END) AS com_team_levels,
          SUM(CASE WHEN leadership_percent > 0 THEN 1 ELSE 0 END) AS com_leadership,
          SUM(is_active) AS ativos
     FROM monthly_user_snapshots
    GROUP BY reference_month
    ORDER BY reference_month DESC;
   ```
   Se `com_team_levels = 0` para todos os meses → snapshot quebrado.
3. **Inspecionar earnings do último mês fechado**:
   ```sql
   SELECT bonus_type, COUNT(*) AS qtd, SUM(amount) AS total
     FROM earnings
    WHERE reference_month = 'YYYY-MM'
    GROUP BY bonus_type;
   ```
   Se faltam linhas de TEAM/LEADERSHIP → cascata pulou ou snapshot zerado.
4. **Inspecionar último lote gerado**:
   ```sql
   SELECT id, user_name, quota_amount, network_amount,
          first_purchase_amount, repurchase_amount, team_amount, leadership_amount,
          status, bonus_paid_at, dividend_paid_at
     FROM payout_requests
    WHERE reference_month = 'YYYY-MM'
    ORDER BY amount DESC
    LIMIT 20;
   ```
   Conferir se o breakdown está populado e se os trilhos de pagamento têm timestamps.

### 2.6 — Conclusão técnica

O motor de cálculo (cascata leaf-up, split bônus/dividendos, prévia em memória) **está estruturalmente correto** após as últimas correções. O que ainda pode reproduzir os sintomas relatados pelo cliente:

- Migration 009 não aplicada em produção (causa direta de "não funciona").
- Snapshot capturado com dados ruins (causa direta de "bônus zerados").
- UX da tabela principal esconde o breakdown (causa direta de "compra e recompra não aparecem").
- Base com muitos inativos (sintoma legítimo, não bug).

Antes de qualquer nova rodada de correção, recomenda-se executar o checklist da seção 2.5.
