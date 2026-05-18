# Análise e Plano — Cálculo de Ganhos de Rede (Projeto Maziero / Ciano)

> Documento de diagnóstico e decisões de redesign do motor de bônus.
> Data da análise: 2026-05-18.

---

## 1. Problema relatado

O sistema de pagamentos não estava calculando os **ganhos de rede**. Sintomas:

- Bônus de **equipe** e **liderança** não eram calculados.
- O admin, ao verificar quanto pagar para cada sócio, via valores **zerados**.
- Os **títulos** apresentavam comportamento inconsistente ("às vezes dão bugs").

---

## 2. Causa raiz — `title_requirements` populada com dados incompletos

Existem **dois seeders concorrentes** para a tabela `title_requirements`, e eles conflitam:

### Seeder bom — `SeedService`
`backend/src/core/database/seed.service.ts` (`seedTitleRequirements`, linhas 85-99) preenche os
campos críticos:

| Título  | `repurchaseLevels` | `teamLevels` | `leadershipPercent` |
|---------|--------------------|--------------|---------------------|
| bronze  | 1                  | 2            | 0                   |
| silver  | 2                  | 3            | 0                   |
| gold    | 4                  | 4            | 1                   |
| diamond | 6                  | 5            | 2                   |

### Seeder ruim — Migration 004
`backend/database/migrations/004-seed-title-requirements.sql` insere as **mesmas linhas**, mas
**apenas com as colunas de título** (`req_type`, `req_quantity`, `req_level`). As colunas
`repurchase_levels`, `team_levels` e `leadership_percent` ficam no **DEFAULT 0**.

### Por que isso quebra tudo

O script de deploy (`docs/DEPLOY-VPS-UBUNTU.md`, linhas 681-693) aplica as **migrations SQL no
passo [2/7], ANTES de o backend subir no passo [4/7]**. Em um servidor novo:

1. A migration 004 roda primeiro → tabela preenchida com `team_levels = 0` e
   `repurchase_levels = 0`.
2. O backend sobe → `seedTitleRequirements()` faz `if (count > 0) return;` → vê a tabela já
   populada → **não corrige nada**.

Resultado: toda a base fica com `teamLevels = 0` e `repurchaseLevels = 0`.

### Efeito no motor de bônus

Em `backend/src/core/bonus/bonus-calculator.service.ts`:

- **Recompra** (linha 95): `if (!titleReq || titleReq.repurchaseLevels < level)` → como
  `repurchaseLevels = 0` e `level ≥ 1`, **pula todos os níveis → recompra = R$ 0 para todos**.
- **Equipe** (linha 139): `if (!titleReq || titleReq.teamLevels === 0) continue;` →
  `teamLevels = 0` → **pula todos → equipe = R$ 0**.
- **Liderança**: não lê `titleReq` (usa 1%/2% fixos), então funciona — mas só para usuários
  Ouro/Diamante. Se quase ninguém na base tem esses títulos, aparece zerado também.

O único bônus que sobrevive é o de **primeira compra** (linha 39), que não depende de `titleReq`.

### Como confirmar (MySQL de produção)

```sql
SELECT title, repurchase_levels, team_levels, leadership_percent FROM title_requirements;
```

Se vier tudo `0`, a causa está confirmada.

---

## 3. Problemas secundários encontrados

1. **`payouts.service.ts` com bug morto** — `calculateDistribution` (linha 43) filtra earnings por
   `status = 'approved'`, valor que **não existe** no enum `EarningStatus` (só há
   `pending`/`paid`/`cancelled`). Esse endpoint sempre retorna `networkEarnings = 0`.

2. **Dois cálculos de dividendo divergentes** — `MonthlyCloseJob` calculava o pool de dividendos a
   partir da soma de earnings do mês (proxy de receita), enquanto `generateBatch` usa o lucro
   líquido informado pelo admin. Como `calculateDividends` é idempotente, o primeiro a rodar vence.

3. **Bônus de equipe somava só `FIRST_PURCHASE + REPURCHASE`** do downline
   (`getDownlineEarnings`), ignorando dividendos e os demais bônus.

4. **Bônus de primeira compra** dá 10% se o patrocinador tem cotas, senão 5%.

5. **Títulos recalculados só na compra** (1 nível acima) + job diário às 03:00. Como o título
   depende de `isActive` (que expira com o tempo), pode ficar desatualizado por até 24h. O
   `recalculateAllTitles` também itera usuários em ordem arbitrária, podendo ler título de
   descendente desatualizado dentro de uma mesma passada.

---

## 4. Decisões tomadas (conversa de 2026-05-18)

| # | Tema | Decisão |
|---|------|---------|
| 1 | Seed de `title_requirements` | **Corrigir.** Ajustar a migration 004 para preencher `repurchase_levels`/`team_levels`/`leadership_percent` E fazer o `SeedService` dar *upsert* nessas colunas em vez de só `if count > 0 return`. |
| 2 | Fonte da verdade financeira | O **lucro líquido digitado pelo admin** manda. Nada de proxy de receita. O `MonthlyCloseJob` **não calcula mais** dividendos/equipe/liderança — só fecha o mês, tira snapshot e zera contadores. |
| 2b | Dividendos | Pool = `profitPayoutPercentage% (padrão 20%) × lucro_líquido`. Distribuído por fração de cotas: quem tem 20% da pool de cotas recebe 20% da pool de dividendos. |
| 2c | Linha do tempo | Lucro de **fevereiro** → digitado em **março** (após o fechamento) → pago em **abril**. `paymentMonth = profitMonth + 2` (já é o comportamento atual). |
| 3 | Base do bônus de equipe/liderança | **Cascata (decisão do cliente).** Equipe = 2% de **literalmente tudo** que as linhas abaixo (dentro do limite de níveis do título) ganharam — compra, recompra, dividendos **e os próprios bônus de equipe/liderança** dos downlines. Idem liderança. |
| 4 | Bônus de primeira compra 10%/5% | Regra **intencional** (5% se a conta não tem cotas, para incentivar a compra). O descritivo está desatualizado. Sem alteração de código. |
| 5 | Recebíveis | Quando o admin gera o lote / manda processar, o valor vira um **"a receber" visível para o usuário**; ao concluir o pagamento, migra para "recebido / ganhos da vida". |

---

## 5. Redesign — cálculo determinístico baseado em snapshot

Objetivo: tornar o cálculo **reproduzível, auditável e imune a alterações posteriores**, para
nunca pagar "R$ 6 para quem deveria receber R$ 50".

### 5.1 Snapshot de fim de mês

Um cronjob, no fechamento do mês, grava uma tabela `monthly_user_snapshot`
(chave `userId + mês`) com **tudo que o cálculo precisa**:

- título do usuário **naquele mês**;
- cotas compradas / possuídas / split;
- status ativo/inativo;
- patrocinador (`sponsorId`);
- nível de sócio.

Quando o admin lançar o lucro de fevereiro (em março, abril, quando for), **todo o cálculo lê o
snapshot de fevereiro** — não o estado atual. Alguém comprar cotas em março não altera nada de
fevereiro. Os bônus passam a ser baseados em dados **imutáveis**.

### 5.2 Modelo de cálculo (recompute-from-snapshot)

Os bônus de compra/recompra gravados "ao vivo" durante o mês passam a ser **prévia/estimativa**.
Os valores **oficiais** são recalculados e travados na geração do lote, a partir do snapshot.

### 5.3 Ordem obrigatória de cálculo (para o mês M)

Como a decisão #3 é **cascata**, equipe/liderança compõem sobre si mesmos e exigem travessia
**das folhas para a raiz** (nível mais profundo primeiro).

1. **Snapshot** de M já gravado no fechamento.
2. Admin informa o **lucro líquido** de M.
3. **Dividendos**: `pool = 20% × lucro`; `dividendo[u] = pool × cotas[u] / totalCotas`
   (cotas do snapshot).
4. **Primeira compra + recompra**: recalculados a partir das transações de compra de M,
   usando os **títulos do snapshot** para o gating de níveis.
5. **Equipe + liderança** (travessia leaf-up — nível mais profundo primeiro):
   - `equipe[u] = 2% × Σ(todos os ganhos da downline dentro de teamLevels[título] níveis)`,
     onde "todos os ganhos" inclui compra + recompra + dividendos + equipe + liderança;
   - `liderança[u] = leadershipPercent[título]% × Σ(todos os ganhos dos downlines QUALIFICADOS
     — ouro/diamante — dentro de 5 níveis)`.
   - A travessia leaf-up garante que, ao calcular `u`, todos os seus downlines já tiveram
     equipe/liderança calculados — fechando a cascata sem recursão frágil.
6. **Travar o lote**: cada usuário recebe um payout =
   `dividendo + primeira compra + recompra + equipe + liderança`, marcado como **"a receber"**.

### 5.4 Máquina de estados de pagamento

```
earning (previsto, durante o mês)
        │  admin gera o lote
        ▼
payout  (a receber)  ──── admin marca processando ───▶ payout (processando)
                                                              │ admin confirma pagamento
                                                              ▼
                                                       payout (pago)
                                                       → entra em "ganhos da vida"
```

### 5.5 Robustez e correções operacionais

- **Validações de sanidade** antes de travar o lote: nenhum valor negativo, total coerente com o
  lucro informado, destacar valores fora da curva (outliers) para revisão do admin.
- **Regerar / anular lote**: hoje `generateBatch` simplesmente recusa se já existe lote para o mês
  (`admin.service.ts:326`). É preciso permitir ao admin **anular e refazer** um lote enquanto não
  estiver pago, para corrigir erros (ex.: lucro digitado errado).

---

## 6. Plano de ação — STATUS

Implementado (servidor novo, sem necessidade de backfill de meses passados):

- [x] Corrigir migration 004 + migration 007 + `SeedService` auto-corretivo (upsert das
      colunas de níveis/percentual a cada boot).
- [x] Criar tabela `monthly_user_snapshots` + `SnapshotService` + captura no `MonthlyCloseJob`.
- [x] Refatorar `BonusCalculatorService`: cascata com travessia leaf-up; equipe/liderança
      somam TODOS os tipos de ganho dos downlines; leitura do snapshot do mês.
- [x] Reordenar `generateBatch`: dividendos → equipe/liderança (ordem da cascata).
- [x] Remover do `MonthlyCloseJob` o cálculo de dividendos/equipe/liderança.
- [x] `calculateDistribution` (admin) lê cotas do snapshot; inclui quem tem ganho de rede
      sem cotas.
- [x] Máquina de estados de recebíveis: recebíveis no dashboard (PENDING+PROCESSING);
      ganho passa a `PAID` ao concluir o pagamento; double-count de `totalEarnings` removido.
- [x] Corrigir o `calculateDistribution` de `payouts.service.ts` (filtro `'approved'`
      inexistente → devolve recebíveis reais).
- [x] Validações de sanidade no `generateBatch` (erros bloqueiam, avisos informam) +
      `voidBatch` (anular lote não-pago) — endpoint `DELETE /admin/payouts/batch/:month`.

Pendências fora do backend / acompanhamento:

- [ ] Tela do usuário "a receber" no frontend (o dado já é exposto pelo dashboard/API).
- [ ] Atualizar o descritivo: regra de 10%/5% no bônus de primeira compra.
- [ ] Reescrever ou remover `earnings.service.spec.ts` (teste obsoleto, pré-existente).
- [ ] Avaliar remoção do controller user-driven `/payouts/*` (não consumido; modelo é
      admin-driven).

---

## 7. Arquivos-chave

| Arquivo | Papel |
|---------|-------|
| `backend/src/core/bonus/bonus-calculator.service.ts` | Motor de bônus (equipe, liderança, dividendos, compra, recompra). |
| `backend/src/core/title/title-calculator.service.ts` | Cálculo de títulos. |
| `backend/src/core/database/seed.service.ts` | Seeder bom de `title_requirements`. |
| `backend/database/migrations/004-seed-title-requirements.sql` | Migration com seed incompleto. |
| `backend/src/jobs/monthly-close.job.ts` | Fechamento mensal. |
| `backend/src/modules/admin/admin.service.ts` | `calculateDistribution` / `generateBatch` / lote. |
| `backend/src/modules/payouts/payouts.service.ts` | Fluxo de payout (contém bug morto). |
| `backend/src/modules/earnings/earnings.service.ts` | Histórico e visão de ganhos do usuário. |
