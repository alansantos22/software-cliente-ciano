# Épicos — Projeto Maziero – Empresa Ciano
**Domínio:** redeciano.com.br

---

## ÉPICO 1 — Tela de Login

### Frontend
- Campo de e-mail
- Campo de senha
- Link "Esqueci a senha"
- Checkbox "Lembrar-me"

### Backend
- Autenticação por email e senha
- Fluxo de "esqueci a senha" (envio de email para redefinir)
- Persistência de sessão quando "Lembrar-me" está marcado

---

## ÉPICO 2 — Dashboard Admin

### Frontend
- Data da lista exibida
- Listas separadas por mês
- Poder ver a lista do mês anterior para consultar pagamentos
- Lista de todos os recebedores com:
  - Chave PIX
  - Contato
  - Valor que cada recebedor tem a receber
- Valor total a pagar no mês
- Check (checkbox) para marcar quando já tiver pago o usuário

### Backend
- A lista fecha dia 01 do mês seguinte, às 00h
- Gerar a lista de recebedores com PIX, contato e valores
- Calcular valor total a pagar
- Guardar o estado do check (pago/não pago) por recebedor
- Criar campos em uma tabela separada para administrar valores:
  - Valor total do lucro da empresa
  - Porcentagem a ser paga do lucro

---

## ÉPICO 3 — Dashboard do Usuário (Ganhos e Títulos)

### Frontend
- Botão de copiar link para enviar a futuros afiliados
- Vendas próprias realizadas
- Vendas realizadas pela rede
- Ganhos dele
- Ganhos em dividendos
- Ganhos totais (dividendos e bonificações)
- Ganhos da vida (o quanto ele ganhou com tudo desde o cadastro)
- Título atual
- Caso o usuário não esteja ativo, ou com a primeira cota comprada, mostrar o quanto ele perdeu por não estar ativo
- Histórico

### Backend
- Calcular todos os valores de ganhos (próprios, rede, dividendos, totais, da vida)
- Calcular projeção de perda para usuários inativos
- Fornecer dados do título atual do usuário
- Fornecer histórico de transações/ganhos

---

## ÉPICO 4 — Tela da Rede do Usuário

### Frontend
- Mostrar toda a rede em formato tree list
- Ao clicar nos usuários, expandir para ver sub-rede
- Filtros por título
- Colocar o valor do nível ao lado do nome da pessoa
- Ao clicar no nome do usuário, ir para a página de detalhes com:
  - Contato
  - Nome completo
  - Título
  - Valores de comissão
  - Valores vendidos
- Futuramente: criar um sistema de pontuação

### Backend
- Montar a árvore da rede do usuário (recursiva)
- Fornecer dados de cada membro (contato, título, comissões, vendas)
- Suportar filtro por título

---

## ÉPICO 5 — Tela de Checkout e Confirmação (Venda de Cotas)

### Frontend
- Confirmação da compra
- Mensagem bonitinha, tipo um parabéns

### Backend
- Processar a compra de cotas
- Registrar a transação
- Atualizar saldo do usuário

---

## ÉPICO 6 — Tela Promocional de Venda de Cotas

### Frontend
- Mostrar as cotas e valores
- Se o usuário tiver intenção de comprar 10 cotas ou mais: atendimento personalizado, com descontos nas pousadas
- Acima de 60 cotas: poderá morar de forma indefinida em uma das pousadas ou hotéis
- Área de FAQ
- Exibir o sistema de sócios com os 4 níveis e benefícios (abaixo)
- Deve mostrar separadamente:
  - Cotas que o usuário comprou (contam para nível de sócio)
  - Cotas que ele possui (podem ter passado por split, não contam para nível de sócio)

### Sistema de Sócios — Grupo de Pousadas Ciano

**Regra geral:** Conforme o sócio compra mais cotas ao longo do tempo, ele automaticamente sobe de nível. Não precisa comprar tudo de uma vez — a evolução é contínua e cumulativa.

**1) SÓCIO — 1 a 9 cotas compradas (R$ 2.500 por cota)**
- Participação nos lucros do Grupo Ciano
- Participação na valorização do grupo
- Pode indicar e ganhar comissões
- Acesso ao grupo geral de investidores

**2) SÓCIO PLATINUM — a partir de 10 cotas compradas (R$ 25.000)**
- Todos os benefícios do Sócio
- 30% de desconto em toda a rede de pousadas Ciano
- Comissão maior nas indicações
- Acesso antecipado a lotes de cotas com desconto sempre que forem disponibilizados
- Reunião mensal exclusiva com Marcos Maziero (fundador)

**3) SÓCIO VIP — a partir de 20 cotas compradas (R$ 50.000)**
- Todos os benefícios do Sócio Platinum
- 50% de desconto em toda a rede de pousadas Ciano
- 1 final de semana gratuito por ano
- Convites para eventos, bastidores e inaugurações
- Nome listado como Sócio VIP em TODAS as pousadas Ciano
- Comissão ainda maior

**4) SÓCIO IMPERIAL — a partir de 60 cotas compradas (R$ 150.000)**
- Todos os benefícios do Sócio VIP
- Hospedagem gratuita e ilimitada para ele + até 3 acompanhantes
- Máximo de 1 quarto simultâneo em qualquer pousada Ciano
- Pode morar em uma das pousadas Ciano, se desejar
- 40% de desconto para familiares e convidados fora da hospedagem gratuita
- Viagem anual com Marcos Maziero (fundador)
- Quadro com foto no hall de uma das pousadas Ciano, com nome e título "Sócio Imperial"
- Canal VIP para falar diretamente com Marcos Maziero
- Acesso ao grupo Imperial

### Backend
- Fornecer preço atual da cota e dados dos níveis
- Calcular e fornecer separação cotas compradas vs cotas possuídas

---

## ÉPICO 7 — Tela de Cadastro (feito por quem já está cadastrado)

### Frontend
Campos do formulário:
- Nome completo
- CPF
- E-mail
- DDD + Telefone (WhatsApp)
- Cidade
- Estado
- Pix (para realizar os pagamentos)
- Compra de cotas
- Deve gerar um ID no final

### Backend
- Mesmo sem a confirmação de compra, deve ser criado o login do usuário
- Gerar ID do novo usuário
- Vincular o patrocinador (quem está cadastrando)
- Gerar código de indicação

---

## ÉPICO 8 — Tela de Cadastro por Link do Afiliado (Landing Page)

### Frontend
- Quem somos
- Imagens das pousadas
- Formulário de cadastro (mesmos campos do épico 7)

### Backend
- Resolver o patrocinador pelo link de indicação
- Mesmo fluxo de criação de usuário do épico 7

---

## ÉPICO 9 — Sistema de Títulos

### Regras (conforme cliente)

**Bronze:**
- Ter 2 pessoas ativas

**Prata:**
- Ajudar 1 direto a virar Bronze

**Ouro:**
- 2 Bronzes em linhas diferentes

**Diamante:**
- 3 Bronzes em linhas diferentes

> Cada pessoa que eu cadastro é uma "linha diferente"

### Frontend
- Exibir título atual do usuário
- Mostrar progresso para o próximo título

### Backend
- Calcular título com base na rede ativa do usuário
- Recalcular ao mudar status de atividade de alguém na rede

---

## ÉPICO 10 — Sistema de Bonificações

### Regras (conforme cliente)

**Bônus de primeira compra:**
- Patrocinador ganha 10% do valor total da compra

**Bônus de recompra:**
- 5% no primeiro nível
- 2% do segundo ao sexto nível
- Profundidade por título: Bronze: 1 nível, Prata: 2 níveis, Ouro: 4 níveis, Diamante: 6 níveis

**Bônus de equipe:**
- Soma os ganhos de todos os patrocinados abaixo dele nos N níveis, e recebe 2% desse total
- Profundidade por título: Bronze: 2 níveis, Prata: 3 níveis, Ouro: 4 níveis, Diamante: 5 níveis

**Bônus de liderança (apenas para Ouro e Diamante — chamados "qualificados"):**
- Ouro: ganha 1% sobre os 5 níveis de qualificados abaixo
- Diamante: ganha 2% dos 5 níveis de qualificados abaixo

**Bônus de recebimento das cotas (dividendos):**
- 20% do lucro do grupo dividido pelo número total de cotas (como uma pool), vezes as cotas que ele tiver

**Observações do cliente:**
- O bônus de compra e recompra também entra nos ganhos dos bônus de liderança e bônus de equipe
- Para receber bônus de equipe/liderança e recompra, precisa estar ativo (ter comprado uma cota nos últimos 6 meses)
- Entretanto, o bônus de indicação (primeira compra) ele ainda recebe mesmo estando inativo
- O bônus de recebimento das cotas (dividendos), os usuários recebem não importando o seu status

### Frontend
- Exibir todos os ganhos separados por tipo
- Tela de ganhos/earnings com histórico

### Backend
- Calcular cada tipo de bônus conforme regras acima
- Calcular dividendos usando lucro e porcentagem definidos pelo admin

---

## ÉPICO 11 — Split e Valorização das Cotas

### Regras (conforme cliente)

**Fórmula para aumentar o valor da cota:**
```
Vc + 500 × Fcv
```
- Vc = Valor da cota
- Fcv = Fase de cota vendida

**Para ativar o split:**
```
Fcv >= 3 → Split nas cotas → Qs++
```
- Qs = Quantidade de splits

**Para meta:**
```
50 × 2^Qs
```

**Observações do cliente:**
- O split é para a quantidade total de cotas de todas as pessoas que já possuem cotas
- As cotas que estão sendo vendidas voltam a ser vendidas pelo valor de R$ 2.000 (não imputa valor às cotas já vendidas, mas sim às futuras)
- Apenas cotas compradas servem para bater as metas de compras de cotas, dando split ou aumento de preço na cota
- Virar o preço, caso caia nas regras de aumento ou split, sempre ao final do dia UTC:00
- Os títulos de sócio só podem ser batidos com cotas compradas pelo usuário; cotas em split não contabilizam para esses títulos (Sócio Imperial, Sócio VIP, etc.)

### Frontend
- Exibir preço atual da cota
- Mostrar progresso até a próxima meta

### Backend
- Verificar diariamente (final do dia UTC:00) se meta foi batida
- Executar aumento de preço ou split conforme fórmulas
- No split: dobrar totalQuotas de todos os usuários (purchasedQuotas não muda)

---

## ÉPICO 12 — Regras Gerais do Sistema

### Regras (conforme cliente)

- O usuário precisa comprar pelo menos 1 cota a cada 6 meses; caso não compre, o perfil fica como inativo, fazendo com que ele não receba as bonificações do período de inatividade
- Ao final do mês, zerar os valores do mês atual
- A lista (admin) fecha dia 01 do mês seguinte, às 00h

### Backend
- Job mensal: fechamento no dia 01 às 00h (calcular bônus, gerar lista de pagamentos, zerar contadores do mês)
- Verificação de inatividade (6 meses sem compra)
- Tabela separada para administrar: valor total do lucro da empresa e porcentagem a ser paga do lucro
