# Bot de Testes E2E — Sistema Ciano

Testes automatizados que cobrem **115 casos de teste** de usabilidade usando [Playwright](https://playwright.dev/).

---

## Pré-requisitos

- **Node.js** 18+
- **Backend** rodando em `http://localhost:3000`
- **Frontend** rodando em `http://localhost:5173`
- **Banco de dados** com o seed padrão (admin@ciano.com / admin123)

---

## Instalação

```bash
cd e2e
npm install
npx playwright install chromium
```

---

## Executar os Testes

### Todos os testes (API + UI)
```bash
npm test
```

### Só testes de API (sem browser — mais rápido)
```bash
npm run test:api
```

### Só testes de UI (com browser)
```bash
npm run test:ui
```

### Testes com browser visível (para debug)
```bash
npm run test:headed
```

### Testes de segurança apenas
```bash
npm run test:security
```

### Ver relatório HTML depois
```bash
npm run test:report
```

---

## Estrutura

```
e2e/
├── playwright.config.ts         ← Configuração geral
├── helpers/
│   └── api-client.ts            ← Cliente HTTP tipado + utilitários
├── tests/
│   ├── api/                     ← Testes de API (sem browser)
│   │   ├── 01-auth.spec.ts      ← TC-AUTH-001~017
│   │   ├── 02-registration.spec.ts ← TC-REG-001~010
│   │   ├── 03-quotas.spec.ts    ← TC-QUOT-001~014
│   │   ├── 04-earnings.spec.ts  ← TC-EARN-001~012
│   │   ├── 05-payouts.spec.ts   ← TC-PAY-001~007, TC-PAYAD-001~006
│   │   ├── 06-network.spec.ts   ← TC-NET-001~008
│   │   ├── 07-security.spec.ts  ← TC-SEC-001~010
│   │   ├── 08-admin.spec.ts     ← TC-ADM, TC-FIN, TC-MGR
│   │   └── 09-edge-cases.spec.ts ← TC-EDGE, TC-DASH, TC-PROF
│   └── ui/                      ← Testes de interface (Chromium)
│       ├── auth.spec.ts         ← Login, registro, recuperação de senha
│       ├── dashboard.spec.ts    ← Dashboard, rede, ganhos
│       ├── checkout.spec.ts     ← Compra de cotas, PIX
│       └── profile.spec.ts      ← Perfil, configurações, admin UI
```

---

## Limpeza de Dados de Teste

Todos os usuários criados pelos testes usam o prefixo `e2e_test_` no e-mail.
Se um teste falhar e não limpar os dados, você pode removê-los manualmente no banco:

```sql
DELETE FROM users WHERE email LIKE 'e2e_test_%';
```

Ou via painel `/admin/manager` (usuários com e-mail `e2e_test_*`).

---

## Observações

- Os testes de API rodam sequencialmente (`workers: 1`) para evitar conflitos no banco.
- O projeto `ui-mobile` testa os mesmos flows em resolução iPhone 13.
- Screenshots e traces são salvos automaticamente em falhas.
