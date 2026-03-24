# Casos de Teste de Usabilidade - Sistema Ciano

> Gerado em: 2026-03-24
> Sistema: Ciano - Sistema de Cotas (MLM)
> Stack: NestJS + MySQL + Vue 3 + Pinia

---

## Índice

1. [Autenticação e Acesso](#1-autenticação-e-acesso)
2. [Registro e Onboarding](#2-registro-e-onboarding)
3. [Dashboard](#3-dashboard)
4. [Cotas e Compra (Checkout)](#4-cotas-e-compra-checkout)
5. [Rede (Network / Downline)](#5-rede-network--downline)
6. [Ganhos (Earnings)](#6-ganhos-earnings)
7. [Saques (Payouts)](#7-saques-payouts)
8. [Perfil e Configurações](#8-perfil-e-configurações)
9. [Painel Admin - Geral](#9-painel-admin---geral)
10. [Painel Admin - Gestão Financeira](#10-painel-admin---gestão-financeira)
11. [Painel Admin - Gerenciamento de Usuários](#11-painel-admin---gerenciamento-de-usuários)
12. [Painel Admin - Pagamentos](#12-painel-admin---pagamentos)
13. [Segurança e Controle de Acesso](#13-segurança-e-controle-de-acesso)
14. [Responsividade e Interface](#14-responsividade-e-interface)
15. [Cenários de Borda e Dados Extremos](#15-cenários-de-borda-e-dados-extremos)

---

## 1. Autenticação e Acesso

### TC-AUTH-001 — Login com credenciais válidas
- **Pré-condição:** Usuário cadastrado e ativo no sistema
- **Passos:**
  1. Acessar `/login`
  2. Inserir e-mail válido e senha correta
  3. Clicar em "Entrar"
- **Resultado esperado:** Redirecionado para `/dashboard`, token JWT armazenado, nome do usuário exibido no topo
- **Verificar também:** Token de acesso e refresh token presentes no localStorage

### TC-AUTH-002 — Login com senha incorreta
- **Passos:**
  1. Inserir e-mail válido e senha errada
  2. Clicar em "Entrar"
- **Resultado esperado:** Mensagem de erro clara ("Credenciais inválidas"), sem revelar qual campo está errado, formulário não limpa o e-mail

### TC-AUTH-003 — Login com e-mail não cadastrado
- **Passos:**
  1. Inserir e-mail inexistente no sistema
  2. Inserir qualquer senha
- **Resultado esperado:** Mesma mensagem genérica de "Credenciais inválidas" (proteção contra enumeração de e-mails)

### TC-AUTH-004 — Login com campos em branco
- **Passos:**
  1. Acessar `/login`
  2. Clicar em "Entrar" sem preencher nada
- **Resultado esperado:** Validação frontend exibe mensagens nos campos obrigatórios, sem disparar requisição ao backend

### TC-AUTH-005 — Login com e-mail em formato inválido
- **Passos:**
  1. Inserir texto sem `@` no campo e-mail
  2. Inserir senha qualquer
  3. Clicar em "Entrar"
- **Resultado esperado:** Validação de formato de e-mail exibida antes do envio

### TC-AUTH-006 — Rate limiting no login (brute force)
- **Passos:**
  1. Tentar login com senha errada repetidamente (6+ vezes seguidas)
- **Resultado esperado:** Sistema bloqueia temporariamente (HTTP 429 Too Many Requests), mensagem amigável ao usuário

### TC-AUTH-007 — Logout
- **Passos:**
  1. Estar logado
  2. Clicar em "Sair" no menu de perfil
- **Resultado esperado:** Tokens removidos do localStorage, refresh token revogado no backend, redirecionado para `/login`

### TC-AUTH-008 — Acesso a rota protegida sem token
- **Passos:**
  1. Limpar localStorage
  2. Tentar acessar `/dashboard` diretamente
- **Resultado esperado:** Redirecionamento automático para `/login`

### TC-AUTH-009 — Token expirado — renovação automática
- **Passos:**
  1. Fazer login
  2. Aguardar expiração do access token (ou manipular horário do token no localStorage)
  3. Tentar fazer qualquer ação autenticada
- **Resultado esperado:** Sistema renova o token via refresh token transparentemente, sem interromper a ação do usuário

### TC-AUTH-010 — Refresh token expirado
- **Passos:**
  1. Simular refresh token expirado ou revogado
  2. Tentar ação autenticada
- **Resultado esperado:** Logout automático, redirecionamento para `/login` com mensagem informando que a sessão expirou

### TC-AUTH-011 — Recuperação de senha — e-mail válido
- **Passos:**
  1. Acessar `/forgot-password`
  2. Inserir e-mail de usuário existente
  3. Submeter formulário
- **Resultado esperado:** Mensagem de confirmação genérica ("Se o e-mail existir, você receberá um link"), sem confirmar existência da conta

### TC-AUTH-012 — Recuperação de senha — e-mail inexistente
- **Passos:**
  1. Inserir e-mail não cadastrado em `/forgot-password`
- **Resultado esperado:** Mesma mensagem genérica de sucesso (proteção contra enumeração)

### TC-AUTH-013 — Reset de senha com token válido
- **Passos:**
  1. Usar link de reset com token válido
  2. Inserir nova senha e confirmação
  3. Submeter
- **Resultado esperado:** Senha alterada, redirecionado para login, token marcado como usado (não pode ser reusado)

### TC-AUTH-014 — Reset de senha com token expirado
- **Passos:**
  1. Usar link de reset com token com mais de 1 hora de criação
- **Resultado esperado:** Mensagem de erro "Token expirado ou inválido", link para nova solicitação

### TC-AUTH-015 — Reset de senha com token já utilizado
- **Passos:**
  1. Usar o mesmo link de reset duas vezes
- **Resultado esperado:** Segunda tentativa retorna erro "Token já utilizado"

### TC-AUTH-016 — Usuário admin acessa área de usuário comum
- **Passos:**
  1. Fazer login como ADMIN
  2. Acessar `/dashboard`, `/network`, `/earnings`
- **Resultado esperado:** Admin pode acessar áreas normais sem problemas

### TC-AUTH-017 — Usuário comum tenta acessar área admin
- **Passos:**
  1. Fazer login como USER
  2. Tentar acessar `/admin` diretamente na URL
- **Resultado esperado:** Acesso negado (HTTP 403 / redirecionamento), sem expor dados admin

---

## 2. Registro e Onboarding

### TC-REG-001 — Registro completo com dados válidos
- **Passos:**
  1. Acessar `/register`
  2. Preencher todos os campos: nome, CPF, e-mail, telefone, cidade, estado, chave PIX, senha
  3. Submeter
- **Resultado esperado:** Conta criada, redirecionado para dashboard, código de referral gerado (formato CIANO-XXXXXX)

### TC-REG-002 — Registro com código de referral válido
- **Passos:**
  1. Acessar `/register` ou `/invite/:referralCode`
  2. Preencher dados com código de patrocinador existente
- **Resultado esperado:** Usuário criado com `sponsorId` correto, aparece na rede do patrocinador

### TC-REG-003 — Registro com código de referral inválido
- **Passos:**
  1. Preencher campo de código de referral com código inexistente
- **Resultado esperado:** Mensagem de erro "Código de indicação inválido"

### TC-REG-004 — Registro com e-mail já cadastrado
- **Passos:**
  1. Inserir e-mail de usuário já existente
- **Resultado esperado:** Erro "E-mail já cadastrado", formulário mantém os outros campos preenchidos

### TC-REG-005 — Registro com CPF já cadastrado
- **Passos:**
  1. Inserir CPF de usuário já existente
- **Resultado esperado:** Erro "CPF já cadastrado"

### TC-REG-006 — Registro com CPF inválido (formato/dígito verificador)
- **Passos:**
  1. Inserir CPF com formato errado (ex: 123.456.789-00)
- **Resultado esperado:** Validação de CPF (verificação do dígito verificador) exibe erro antes do envio

### TC-REG-007 — Registro sem campos obrigatórios
- **Passos:**
  1. Tentar submeter formulário vazio ou com campos ausentes
- **Resultado esperado:** Validação frontend com mensagem em cada campo obrigatório faltante

### TC-REG-008 — Registro com senha fraca
- **Passos:**
  1. Inserir senha curta ou sem complexidade
- **Resultado esperado:** Feedback visual sobre requisitos de senha (força, caracteres mínimos)

### TC-REG-009 — Acesso via link de convite
- **Passos:**
  1. Acessar `/invite/CIANO-ABC123` ou `/r/CIANO-ABC123`
  2. Verificar campo de referral pré-preenchido
- **Resultado esperado:** Formulário de registro aberto com código do patrocinador preenchido automaticamente

### TC-REG-010 — Acesso via link de convite com código inexistente
- **Passos:**
  1. Acessar `/invite/CIANO-INVALID`
- **Resultado esperado:** Formulário de registro aberto, porém com aviso de código inválido ou campo de código vazio

---

## 3. Dashboard

### TC-DASH-001 — Carregamento dos KPIs
- **Pré-condição:** Usuário logado com ao menos 1 cota comprada e ganhos registrados
- **Passos:**
  1. Acessar `/dashboard`
- **Resultado esperado:** Todos os KPIs carregam corretamente (cotas, saldo de ganhos, rede, mês atual)

### TC-DASH-002 — Dashboard de usuário sem cotas e sem rede
- **Passos:**
  1. Fazer login com usuário recém-cadastrado, sem compras e sem indicados
  2. Acessar `/dashboard`
- **Resultado esperado:** Estados vazios exibidos corretamente ("Você ainda não tem cotas", etc.), sem erros de tela

### TC-DASH-003 — Exibição do código de referral
- **Passos:**
  1. Verificar se o código de referral está visível no dashboard
  2. Clicar em "Copiar" ou link de compartilhamento
- **Resultado esperado:** Código copiado para área de transferência, feedback visual de confirmação

### TC-DASH-004 — Janela de pagamento
- **Passos:**
  1. Acessar dashboard em diferentes períodos do mês
- **Resultado esperado:** Janela de pagamento corretamente calculada com data de abertura e fechamento

### TC-DASH-005 — Top earners ranking
- **Passos:**
  1. Verificar lista dos maiores ganhadores no dashboard
- **Resultado esperado:** Lista ordenada por valor, sem expor dados sensíveis dos outros usuários

### TC-DASH-006 — Gráfico de distribuição de cotas
- **Passos:**
  1. Verificar gráfico de cotas do usuário (compradas vs. split)
- **Resultado esperado:** Gráfico renderiza corretamente, dados coincidem com saldo real

### TC-DASH-007 — Feed de atividades recentes
- **Passos:**
  1. Verificar feed de atividades no dashboard
- **Resultado esperado:** Atividades recentes listadas em ordem cronológica descendente

### TC-DASH-008 — Notificações
- **Passos:**
  1. Verificar painel de notificações
- **Resultado esperado:** Notificações exibidas, lidas/não lidas distinguidas visualmente

---

## 4. Cotas e Compra (Checkout)

### TC-QUOT-001 — Visualização das informações de cotas
- **Passos:**
  1. Acessar `/quotas`
- **Resultado esperado:** Preço atual, total vendido, próximo evento (aumento/split), saldo do usuário, nível parceiro

### TC-QUOT-002 — Visualização dos níveis de parceiro
- **Passos:**
  1. Verificar seção de níveis no `/quotas`
- **Resultado esperado:** Tabela/lista com requisitos de cada nível (SOCIO/PLATINUM/VIP/IMPERIAL) e cotas necessárias

### TC-QUOT-003 — Compra de cotas com quantidade mínima válida
- **Passos:**
  1. Acessar `/checkout`
  2. Selecionar quantidade mínima permitida (ex: 1)
  3. Escolher método de pagamento
  4. Confirmar
- **Resultado esperado:** Transação criada com status PENDING, redirecionado para confirmação

### TC-QUOT-004 — Compra acima do máximo permitido por usuário
- **Passos:**
  1. Tentar inserir quantidade que exceda o limite máximo (ex: maxQuotasPerUser)
- **Resultado esperado:** Validação impede a compra, mensagem explicativa do limite

### TC-QUOT-005 — Compra com quantidade zero ou negativa
- **Passos:**
  1. Tentar inserir 0 ou valor negativo no campo de quantidade
- **Resultado esperado:** Campo não aceita valores inválidos (validação frontend + backend)

### TC-QUOT-006 — Compra via PIX — geração e cópia do código
- **Passos:**
  1. Selecionar pagamento por PIX
  2. Verificar exibição do código PIX e QR code
  3. Clicar em "Copiar código"
- **Resultado esperado:** Código PIX gerado, copiável, QR code escaneável

### TC-QUOT-007 — Compra via Boleto — download e código de barras
- **Passos:**
  1. Selecionar pagamento por Boleto
  2. Verificar botão de download e linha digitável
- **Resultado esperado:** Boleto disponível para download, linha digitável visível e copiável

### TC-QUOT-008 — Compra via Cartão — redirecionamento externo
- **Passos:**
  1. Selecionar pagamento por Cartão
  2. Confirmar compra
- **Resultado esperado:** Redirecionamento para gateway externo ocorre corretamente

### TC-QUOT-009 — Página de confirmação da compra
- **Passos:**
  1. Acessar `/checkout/confirmation/:transactionId` com ID válido
- **Resultado esperado:** Detalhes da transação exibidos (quantidade, valor, status, data)

### TC-QUOT-010 — Confirmação com transactionId inválido
- **Passos:**
  1. Acessar `/checkout/confirmation/id-inexistente`
- **Resultado esperado:** Mensagem de erro clara ou redirecionamento para dashboard

### TC-QUOT-011 — Confirmação de compra de outro usuário
- **Passos:**
  1. Tentar acessar o ID de transação de outro usuário
- **Resultado esperado:** Acesso negado (403) ou redirecionamento

### TC-QUOT-012 — Preço exibido corresponde ao estado atual do sistema
- **Passos:**
  1. Verificar preço exibido no `/quotas` e no `/checkout`
- **Resultado esperado:** Preço consistente nos dois pontos, refletindo o estado atual da `QuotaSystemState`

### TC-QUOT-013 — Estimativa de rendimento por cota
- **Passos:**
  1. Verificar valor de rendimento estimado exibido
- **Resultado esperado:** Valor calculado conforme configuração do admin (`presentationMetrics`)

### TC-QUOT-014 — Níveis de parceiro recalculados após compra
- **Passos:**
  1. Verificar nível antes da compra
  2. Comprar cotas suficientes para subir de nível
  3. Verificar nível após compra
- **Resultado esperado:** Nível de parceiro atualizado automaticamente

---

## 5. Rede (Network / Downline)

### TC-NET-001 — Visualização da árvore de rede
- **Passos:**
  1. Acessar `/network` com usuário que tem ao menos 1 indicado
- **Resultado esperado:** Árvore de downline exibida até 6 níveis de profundidade

### TC-NET-002 — Rede vazia
- **Passos:**
  1. Acessar `/network` com usuário sem indicados
- **Resultado esperado:** Estado vazio exibido com mensagem orientando compartilhar link de referral

### TC-NET-003 — Estatísticas da rede
- **Passos:**
  1. Verificar painel de estatísticas em `/network`
- **Resultado esperado:** Contagem de ativos/inativos, volume total, linhas qualificadas — dados corretos

### TC-NET-004 — Membro ativo vs. inativo
- **Passos:**
  1. Verificar distinção visual entre membros ativos (compra nos últimos 6 meses) e inativos
- **Resultado esperado:** Indicação visual clara (cor, ícone, badge) diferenciando status

### TC-NET-005 — Data de expiração da atividade
- **Passos:**
  1. Clicar em um membro da rede
  2. Verificar data de vencimento da atividade (6 meses após última compra)
- **Resultado esperado:** Data exibida corretamente

### TC-NET-006 — Distribuição de títulos na rede
- **Passos:**
  1. Verificar seção de distribuição de títulos
- **Resultado esperado:** Contagem de membros por título (NONE, BRONZE, SILVER, GOLD, DIAMOND) correta

### TC-NET-007 — Detalhes de um membro da rede
- **Passos:**
  1. Clicar em um nó da árvore
- **Resultado esperado:** Painel/modal com detalhes do membro (nome, título, cotas, status, nível)

### TC-NET-008 — Registrar novo membro via `/register-user`
- **Passos:**
  1. Acessar `/register-user`
  2. Preencher dados do novo membro
  3. Confirmar
- **Resultado esperado:** Novo usuário criado na rede do usuário logado, aparece na árvore

---

## 6. Ganhos (Earnings)

### TC-EARN-001 — Listagem de ganhos paginada
- **Passos:**
  1. Acessar `/earnings`
  2. Navegar pelas páginas de ganhos
- **Resultado esperado:** Paginação funciona, dados corretos por página

### TC-EARN-002 — Filtro por tipo de bônus
- **Passos:**
  1. Filtrar por FIRST_PURCHASE, REPURCHASE, TEAM, LEADERSHIP, DIVIDEND
- **Resultado esperado:** Apenas ganhos do tipo selecionado exibidos

### TC-EARN-003 — Resumo mensal de ganhos
- **Passos:**
  1. Selecionar um mês específico
- **Resultado esperado:** Breakdown correto por tipo de bônus para o mês selecionado

### TC-EARN-004 — Overview de ganhos
- **Passos:**
  1. Verificar cards de resumo no topo da página
- **Resultado esperado:** Total geral, pendente, mês atual e mês anterior exibidos corretamente

### TC-EARN-005 — Bônus de primeira compra gerado
- **Pré-condição:** Usuário com patrocinador
- **Passos:**
  1. Realizar primeira compra de cotas
  2. Verificar ganhos do patrocinador
- **Resultado esperado:** Bônus de 10% registrado para o patrocinador em `FIRST_PURCHASE`

### TC-EARN-006 — Bônus de recompra gerado nos níveis corretos
- **Passos:**
  1. Realizar recompra de cotas
  2. Verificar ganhos dos uplines (níveis 1-6)
- **Resultado esperado:** 5% para L1, 2% para L2-6 (conforme títulos desbloqueados)

### TC-EARN-007 — Restrição de bônus por título
- **Passos:**
  1. Verificar que bônus de nível 3+ só são pagos se upline tem título suficiente (SILVER+)
- **Resultado esperado:** Apenas uplines com título adequado recebem bônus dos níveis correspondentes

### TC-EARN-008 — Bônus de time (team bonus)
- **Passos:**
  1. Verificar ganhos de TEAM de um usuário com downline com ganhos
- **Resultado esperado:** 2% dos ganhos do downline até N níveis conforme título do usuário

### TC-EARN-009 — Bônus de liderança (Gold/Diamond)
- **Passos:**
  1. Verificar ganhos de LEADERSHIP para usuário com título GOLD ou DIAMOND
- **Resultado esperado:** 1% (Gold) ou 2% (Diamond) de bônus de liderança registrado

### TC-EARN-010 — Distribuição de dividendos pro-rata
- **Passos:**
  1. Verificar ganho DIVIDEND proporcional às cotas do usuário vs. total de cotas do sistema
- **Resultado esperado:** Valor proporcional à participação de cotas

### TC-EARN-011 — Elegibilidade de cutoff
- **Passos:**
  1. Verificar ganhos de usuário registrado após o cutoff do mês (último dia do mês anterior)
- **Resultado esperado:** Usuário não elegível para ganhos daquele mês

### TC-EARN-012 — Ganhos de usuário inativo
- **Passos:**
  1. Verificar comportamento de ganhos para membro inativo (sem compra há 6+ meses)
- **Resultado esperado:** Bônus não gerado para uplines do membro inativo (conforme regras de atividade)

---

## 7. Saques (Payouts)

### TC-PAY-001 — Calcular distribuição de saque
- **Passos:**
  1. Acessar tela de saque
  2. Verificar distribuição calculada (quota amount vs. network amount)
- **Resultado esperado:** Cálculo correto exibido antes de confirmar pedido

### TC-PAY-002 — Solicitar saque dentro da janela de pagamento
- **Pré-condição:** Estar no período de janela de pagamento aberta
- **Passos:**
  1. Solicitar saque com chave PIX configurada
- **Resultado esperado:** Pedido criado com status PENDING, PIX key salva corretamente

### TC-PAY-003 — Tentar saque fora da janela de pagamento
- **Passos:**
  1. Tentar solicitar saque quando janela fechada
- **Resultado esperado:** Erro claro informando que a janela de pagamento está fechada

### TC-PAY-004 — Saque sem chave PIX cadastrada
- **Passos:**
  1. Tentar solicitar saque sem chave PIX no perfil
- **Resultado esperado:** Mensagem orientando cadastrar chave PIX antes de solicitar

### TC-PAY-005 — Histórico de saques do usuário
- **Passos:**
  1. Verificar lista de saques solicitados
- **Resultado esperado:** Lista com status (PENDING/PROCESSING/COMPLETED/FAILED), datas e valores

### TC-PAY-006 — Detalhes de um saque
- **Passos:**
  1. Clicar em saque específico
- **Resultado esperado:** Detalhes completos (valor, PIX key, tipo, data, motivo de rejeição se aplicável)

### TC-PAY-007 — Saque rejeitado — exibição do motivo
- **Passos:**
  1. Verificar saque com status FAILED
- **Resultado esperado:** Motivo da rejeição (`failureReason`) exibido claramente ao usuário

---

## 8. Perfil e Configurações

### TC-PROF-001 — Visualizar e editar perfil
- **Passos:**
  1. Acessar `/profile`
  2. Alterar nome, telefone, cidade, estado
  3. Salvar
- **Resultado esperado:** Dados atualizados, confirmação de sucesso exibida

### TC-PROF-002 — Atualizar chave PIX
- **Passos:**
  1. Alterar tipo e valor da chave PIX
  2. Salvar
- **Resultado esperado:** Nova chave PIX salva, sem afetar saques já solicitados

### TC-PROF-003 — Upload de avatar
- **Passos:**
  1. Fazer upload de imagem de perfil
- **Resultado esperado:** Imagem salva e exibida no perfil e no header

### TC-PROF-004 — Avatar com formato inválido
- **Passos:**
  1. Tentar fazer upload de arquivo não-imagem (ex: .pdf, .exe)
- **Resultado esperado:** Erro de validação, arquivo não aceito

### TC-PROF-005 — Configurações de preferências
- **Passos:**
  1. Acessar `/settings`
  2. Alterar preferências de notificação e privacidade
  3. Salvar
- **Resultado esperado:** Preferências salvas, mantidas após logout e login

### TC-PROF-006 — E-mail e CPF não são editáveis
- **Passos:**
  1. Verificar se campos de e-mail e CPF estão bloqueados para edição
- **Resultado esperado:** Campos somente leitura ou ausentes do formulário de edição

---

## 9. Painel Admin - Geral

### TC-ADM-001 — Acesso ao painel admin
- **Pré-condição:** Usuário com role ADMIN
- **Passos:**
  1. Fazer login como admin
  2. Acessar `/admin`
- **Resultado esperado:** Dashboard admin carregado com KPIs do sistema

### TC-ADM-002 — KPIs do admin dashboard
- **Passos:**
  1. Verificar cards de KPI (total de cotas vendidas, total de ganhos, usuários ativos, etc.)
- **Resultado esperado:** Dados corretos e atualizados em tempo real

### TC-ADM-003 — Gráfico de vendas
- **Passos:**
  1. Verificar gráfico de vendas no admin
- **Resultado esperado:** Gráfico renderizado com dados históricos corretos

### TC-ADM-004 — Relatório de distribuição de títulos
- **Passos:**
  1. Verificar seção de títulos
- **Resultado esperado:** Contagem de usuários por título (NONE/BRONZE/SILVER/GOLD/DIAMOND) correta

### TC-ADM-005 — Lista CRM de usuários
- **Passos:**
  1. Acessar lista CRM no admin
- **Resultado esperado:** Todos os usuários listados com dados principais (nome, e-mail, título, cotas, status)

### TC-ADM-006 — Price engine — estado atual
- **Passos:**
  1. Verificar estado atual do motor de preços
- **Resultado esperado:** Preço atual, fase, splitCount, próximo evento exibidos corretamente

### TC-ADM-007 — Price engine — atualização manual
- **Passos:**
  1. Alterar configurações do motor de preços (forçar aumento/split)
  2. Salvar
- **Resultado esperado:** Estado atualizado, evento registrado no SplitEvent

### TC-ADM-008 — Forçar split manualmente
- **Passos:**
  1. Usar função de forçar split no price engine
- **Resultado esperado:** Cotas de todos os usuários dobradas, evento registrado, preço recalculado

---

## 10. Painel Admin - Gestão Financeira

### TC-FIN-001 — Visualizar configurações financeiras globais
- **Passos:**
  1. Acessar `/admin/financial`
- **Resultado esperado:** `minQuotas`, `maxQuotasPerUser`, `totalQuotasAvailable`, `paymentDay` exibidos

### TC-FIN-002 — Atualizar configurações financeiras
- **Passos:**
  1. Alterar limite máximo de cotas por usuário
  2. Salvar
- **Resultado esperado:** Nova configuração aplicada imediatamente, validada no próximo checkout

### TC-FIN-003 — Configuração mensal — criar/visualizar
- **Passos:**
  1. Acessar configuração do mês atual
- **Resultado esperado:** `netProfit`, `dividendPool`, modo de fechamento exibidos

### TC-FIN-004 — Configuração mensal — atualizar lucro líquido
- **Passos:**
  1. Alterar valor de lucro líquido do mês
  2. Salvar
- **Resultado esperado:** Valor salvo, utilizado nos cálculos de ganhos do mês

### TC-FIN-005 — Fechar mês
- **Passos:**
  1. Clicar em "Fechar mês" para o mês corrente
- **Resultado esperado:** Mês encerrado, earnings calculados, não permite novos lançamentos no mês fechado

### TC-FIN-006 — Atualizar plano de carreira (título requirements)
- **Passos:**
  1. Acessar `/admin/career-plan`
  2. Alterar requisitos de um título (ex: mínimo de cotas para GOLD)
  3. Salvar
- **Resultado esperado:** Requisito atualizado, títulos dos usuários recalculados conforme nova regra

### TC-FIN-007 — Atualizar métricas de apresentação
- **Passos:**
  1. Alterar rendimento estimado por cota nas métricas de apresentação
  2. Salvar
- **Resultado esperado:** Novo valor exibido nas telas de cotas para todos os usuários

---

## 11. Painel Admin - Gerenciamento de Usuários

### TC-MGR-001 — Acesso ao gerenciador com senha correta
- **Passos:**
  1. Acessar `/admin/manager`
  2. Inserir senha de proteção do gerenciador
- **Resultado esperado:** Acesso liberado, lista de usuários exibida

### TC-MGR-002 — Acesso ao gerenciador com senha incorreta
- **Passos:**
  1. Inserir senha errada no gerenciador
- **Resultado esperado:** Acesso negado, mensagem de erro

### TC-MGR-003 — Criar novo usuário via gerenciador
- **Passos:**
  1. Clicar em "Novo usuário"
  2. Preencher dados e definir senha inicial
  3. Confirmar
- **Resultado esperado:** Usuário criado no sistema

### TC-MGR-004 — Editar usuário existente
- **Passos:**
  1. Selecionar usuário
  2. Editar campos permitidos (nome, role, etc.)
  3. Salvar
- **Resultado esperado:** Dados atualizados

### TC-MGR-005 — Deletar usuário (soft delete)
- **Passos:**
  1. Selecionar usuário
  2. Clicar em deletar e confirmar
- **Resultado esperado:** Usuário com `deletedAt` preenchido, não aparece nas listas normais, aparece na lixeira

### TC-MGR-006 — Restaurar usuário deletado
- **Passos:**
  1. Acessar lixeira
  2. Restaurar usuário
- **Resultado esperado:** `deletedAt` limpo, usuário ativo novamente

### TC-MGR-007 — Redefinir senha de usuário via gerenciador
- **Passos:**
  1. Selecionar usuário
  2. Definir nova senha
  3. Confirmar
- **Resultado esperado:** Senha alterada, usuário consegue logar com nova senha

### TC-MGR-008 — Alterar role de USER para ADMIN
- **Passos:**
  1. Promover usuário a ADMIN
- **Resultado esperado:** Usuário passa a ter acesso ao painel admin

---

## 12. Painel Admin - Pagamentos

### TC-PAYAD-001 — Listagem de saques pendentes
- **Passos:**
  1. Acessar `/admin/payouts`
  2. Filtrar por PENDING
- **Resultado esperado:** Lista de pedidos de saque pendentes com dados do usuário, valor e PIX key

### TC-PAYAD-002 — Aprovar saque (PENDING → PROCESSING)
- **Passos:**
  1. Selecionar pedido PENDING
  2. Clicar em "Aprovar/Processar"
- **Resultado esperado:** Status muda para PROCESSING, usuário notificado

### TC-PAYAD-003 — Confirmar pagamento (PROCESSING → COMPLETED)
- **Passos:**
  1. Selecionar pedido PROCESSING
  2. Clicar em "Confirmar Pagamento"
- **Resultado esperado:** Status muda para COMPLETED

### TC-PAYAD-004 — Rejeitar saque com motivo
- **Passos:**
  1. Selecionar pedido PENDING
  2. Clicar em "Rejeitar"
  3. Informar motivo
- **Resultado esperado:** Status muda para FAILED, motivo salvo e visível ao usuário

### TC-PAYAD-005 — Gerar lote de pagamentos
- **Passos:**
  1. Clicar em "Gerar lote de pagamentos"
  2. Informar lucro/dividendos do período
- **Resultado esperado:** Cálculo de distribuição gerado para todos os usuários elegíveis

### TC-PAYAD-006 — Estatísticas de pagamentos por mês
- **Passos:**
  1. Verificar estatísticas de pagamentos
- **Resultado esperado:** Total pago, pendente, processando por mês exibidos corretamente

---

## 13. Segurança e Controle de Acesso

### TC-SEC-001 — Manipulação de token JWT (token de outro usuário)
- **Passos:**
  1. Usar token JWT de outro usuário no localStorage
- **Resultado esperado:** Backend valida userId do token, acesso apenas aos dados do dono do token

### TC-SEC-002 — IDOR — Acessar dados de outro usuário via ID na URL
- **Passos:**
  1. Alterar ID na URL de `/checkout/confirmation/:id` ou `/api/users/:id`
- **Resultado esperado:** Backend valida que o usuário autenticado é dono do recurso, 403 se não for

### TC-SEC-003 — Injeção de SQL via campos de formulário
- **Passos:**
  1. Tentar inserir `'; DROP TABLE users; --` em campos de texto
- **Resultado esperado:** Parâmetros sanitizados pelo TypeORM, sem efeito no banco

### TC-SEC-004 — XSS em campos de texto
- **Passos:**
  1. Inserir `<script>alert('xss')</script>` em campos como nome, cidade
- **Resultado esperado:** Script não executado, dado salvo como texto ou rejeitado pela validação

### TC-SEC-005 — CSRF — Requisições sem token válido
- **Passos:**
  1. Tentar chamada de API de outro domínio sem token
- **Resultado esperado:** CORS bloqueia a requisição

### TC-SEC-006 — Enumeração de usuários por referral code
- **Passos:**
  1. Tentar vários códigos de referral via API para descobrir usuários existentes
- **Resultado esperado:** Rate limiting bloqueia após N tentativas

### TC-SEC-007 — Acesso direto a endpoints admin sem role ADMIN
- **Passos:**
  1. Fazer login como USER
  2. Chamar `GET /api/admin/dashboard/kpis` com token válido de USER
- **Resultado esperado:** HTTP 403 Forbidden

### TC-SEC-008 — Token sem assinatura válida
- **Passos:**
  1. Manipular payload do JWT e enviar sem re-assinar
- **Resultado esperado:** HTTP 401 Unauthorized, token rejeitado

### TC-SEC-009 — Replay de refresh token revogado
- **Passos:**
  1. Fazer logout
  2. Tentar usar o refresh token antigo para obter novo access token
- **Resultado esperado:** HTTP 401, token marcado como revogado não aceito

### TC-SEC-010 — Verificação de throttle em endpoints sensíveis
- **Passos:**
  1. Disparar muitas requisições rápidas para `/api/auth/login`
  2. Verificar resposta após exceder limite
- **Resultado esperado:** HTTP 429, com cabeçalho Retry-After

---

## 14. Responsividade e Interface

### TC-UI-001 — Layout mobile (< 768px)
- **Passos:**
  1. Acessar sistema em dispositivo móvel ou modo responsivo do browser
  2. Navegar por todas as seções principais
- **Resultado esperado:** Layout responsivo, sem overflow horizontal, sidebar colapsável

### TC-UI-002 — Layout tablet (768px - 1024px)
- **Passos:**
  1. Verificar layout em resolução de tablet
- **Resultado esperado:** Layout adaptado, sem quebras visuais

### TC-UI-003 — Feedback de carregamento (loading states)
- **Passos:**
  1. Navegar entre páginas com conexão lenta simulada
- **Resultado esperado:** Spinners/skeletons exibidos durante carregamento de dados

### TC-UI-004 — Tratamento de erro de rede
- **Passos:**
  1. Desconectar da internet
  2. Tentar realizar ação (compra, login, etc.)
- **Resultado esperado:** Mensagem de erro de conexão amigável, sem quebra de tela

### TC-UI-005 — Internacionalização (i18n)
- **Passos:**
  1. Verificar se todas as telas estão traduzidas
  2. Mudar idioma (se suportado)
- **Resultado esperado:** Sem textos hardcoded fora do sistema i18n, sem chaves expostas

### TC-UI-006 — Animações e feedback visual de ações
- **Passos:**
  1. Realizar compra de cotas com sucesso
- **Resultado esperado:** Animação de confetti e/ou feedback visual positivo exibido

### TC-UI-007 — Consistência de formatação de moeda
- **Passos:**
  1. Verificar todos os valores monetários no sistema
- **Resultado esperado:** Formatação em R$ com 2 casas decimais, separador de milhar correto (padrão PT-BR)

### TC-UI-008 — Formatação de CPF e telefone
- **Passos:**
  1. Verificar exibição de CPF e telefone no perfil e admin CRM
- **Resultado esperado:** Formato com máscara: XXX.XXX.XXX-XX para CPF, (XX) XXXXX-XXXX para telefone

---

## 15. Cenários de Borda e Dados Extremos

### TC-EDGE-001 — Usuário com quantidade máxima de cotas
- **Passos:**
  1. Usuário com cotas = maxQuotasPerUser tenta comprar mais
- **Resultado esperado:** Bloqueio com mensagem explicativa de limite atingido

### TC-EDGE-002 — Rede com 6 níveis de profundidade completos
- **Passos:**
  1. Verificar visualização da rede com exatamente 6 níveis
- **Resultado esperado:** Todos os 6 níveis renderizados, sem recursão infinita ou erro de memória

### TC-EDGE-003 — Usuário sem patrocinador (primeiro usuário / admin)
- **Passos:**
  1. Verificar comportamento de usuário raiz (sem sponsorId)
- **Resultado esperado:** Sistema funciona normalmente, bônus de upline não são calculados para ele

### TC-EDGE-004 — Split do sistema com grande volume de cotas
- **Passos:**
  1. Simular split quando há muitos usuários com cotas
- **Resultado esperado:** Todas as cotas de todos os usuários são dobradas corretamente sem falha

### TC-EDGE-005 — Concorrência — duas compras simultâneas no mesmo usuário
- **Passos:**
  1. Disparar duas requisições de compra simultaneamente para o mesmo usuário
- **Resultado esperado:** Sistema processa corretamente sem duplicar transações ou ultrapassar limite de cotas

### TC-EDGE-006 — Mês sem nenhuma compra
- **Passos:**
  1. Verificar relatórios e ganhos de um mês onde não houve compras
- **Resultado esperado:** Zerado corretamente, sem erros de divisão por zero

### TC-EDGE-007 — Dividendo com apenas 1 usuário com cotas
- **Passos:**
  1. Calcular dividendo quando apenas 1 usuário tem cotas
- **Resultado esperado:** 100% dos dividendos para esse usuário, cálculo pro-rata correto

### TC-EDGE-008 — Usuário com nome/cidade contendo caracteres especiais
- **Passos:**
  1. Cadastrar usuário com nome "José D'Ávila" ou "São Paulo"
- **Resultado esperado:** Salvo e exibido corretamente (charset utf8mb4)

### TC-EDGE-009 — Campo PIX com tipos diferentes
- **Passos:**
  1. Testar cada tipo de chave PIX: CPF, e-mail, telefone, chave aleatória
- **Resultado esperado:** Cada tipo aceito e validado corretamente

### TC-EDGE-010 — Título recalculado para baixo
- **Passos:**
  1. Usuário com título GOLD que perde requisitos (ex: admin altera requisitos)
- **Resultado esperado:** Título recalculado para nível correto, bônus ajustados automaticamente

### TC-EDGE-011 — Sessão simultânea em múltiplos dispositivos
- **Passos:**
  1. Fazer login no dispositivo A e dispositivo B simultaneamente
  2. Fazer logout no dispositivo A
- **Resultado esperado:** Logout no A não invalida sessão em B (a menos que seja design intencional de revogação global)

### TC-EDGE-012 — Muito tempo na mesma página sem interação
- **Passos:**
  1. Deixar o sistema aberto por mais de 15 minutos sem interação
  2. Tentar realizar ação
- **Resultado esperado:** Token renovado automaticamente via refresh, ou sessão expirada com mensagem clara

### TC-EDGE-013 — Acesso após soft delete do usuário
- **Passos:**
  1. Deletar usuário (soft delete)
  2. Tentar fazer login com as credenciais do usuário deletado
- **Resultado esperado:** Login negado, usuário não encontrado nas queries filtradas por deletedAt IS NULL

### TC-EDGE-014 — Referral code de usuário deletado
- **Passos:**
  1. Tentar se registrar usando o código de referral de um usuário soft-deletado
- **Resultado esperado:** Código não encontrado ou registro negado

### TC-EDGE-015 — Números decimais em campos numéricos
- **Passos:**
  1. Inserir valor decimal (ex: 1.5) no campo de quantidade de cotas
- **Resultado esperado:** Campo aceita apenas inteiros positivos, validação bloqueia decimais

---

## Matriz de Prioridade dos Testes

| Criticidade | Casos de Teste |
|-------------|----------------|
| **CRÍTICO** | TC-AUTH-001 a 010, TC-SEC-001 a 010, TC-QUOT-003 a 005, TC-PAY-002 a 004, TC-EARN-005 a 012 |
| **ALTO** | TC-REG-001 a 008, TC-QUOT-011 a 014, TC-PAYAD-001 a 006, TC-EDGE-004 a 006 |
| **MÉDIO** | TC-DASH-001 a 008, TC-NET-001 a 008, TC-FIN-001 a 007, TC-MGR-001 a 008 |
| **BAIXO** | TC-UI-001 a 008, TC-PROF-001 a 006, TC-EDGE-008 a 015 |

---

## Checklist de Pré-requisitos para Execução dos Testes

- [ ] Ambiente de staging/homologação configurado
- [ ] Banco de dados populado com dados de teste (seed)
- [ ] Usuários de teste criados: 1 ADMIN, 3 USERs em rede de 3 níveis, 1 USER sem rede
- [ ] Configurações financeiras globais definidas (minQuotas=1, maxQuotasPerUser=100, paymentDay=5)
- [ ] Al menos 1 mês com dados de ganhos calculados
- [ ] Janela de pagamento aberta para testes de saque
- [ ] Price engine em estado conhecido (fase 0, splitCount=0)
- [ ] Ambiente de e-mail configurado ou mockado para testes de reset de senha
- [ ] DevTools / Postman disponível para testes de segurança de API

---

*Documento gerado automaticamente com base na análise do código-fonte do sistema Ciano.*
