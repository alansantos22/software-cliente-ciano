export default {
  // ========== COMMON ==========
  common: {
    loading: 'Carregando...',
    save: 'Salvar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    delete: 'Excluir',
    edit: 'Editar',
    back: 'Voltar',
    next: 'Próximo',
    previous: 'Anterior',
    search: 'Buscar',
    filter: 'Filtrar',
    clear: 'Limpar',
    copy: 'Copiar',
    copied: 'Copiado!',
    close: 'Fechar',
    yes: 'Sim',
    no: 'Não',
    or: 'ou',
    all: 'Todos',
    none: 'Nenhum',
    required: 'Obrigatório',
    optional: 'Opcional',
  },

  // ========== AUTH ==========
  auth: {
    login: 'Entrar',
    logout: 'Sair',
    email: 'E-mail',
    password: 'Senha',
    confirmPassword: 'Confirmar Senha',
    rememberMe: 'Lembrar-me',
    forgotPassword: 'Esqueci minha senha',
    resetPassword: 'Redefinir Senha',
    newPassword: 'Nova Senha',
    sendResetLink: 'Enviar Link de Recuperação',
    backToLogin: 'Voltar para Login',
    invalidCredentials: 'E-mail ou senha inválidos',
    emailRequired: 'E-mail é obrigatório',
    emailInvalid: 'E-mail inválido',
    passwordRequired: 'Senha é obrigatória',
    passwordMinLength: 'Senha deve ter pelo menos 8 caracteres',
    passwordsDoNotMatch: 'As senhas não conferem',
    resetEmailSent: 'E-mail de recuperação enviado!',
    passwordResetSuccess: 'Senha alterada com sucesso!',
  },

  // ========== DASHBOARD ==========
  dashboard: {
    title: 'Dashboard',
    welcome: 'Bem-vindo(a)',
    myReferralLink: 'Meu Link de Indicação',
    copyLink: 'Copiar Link',
    ownSales: 'Vendas Próprias',
    networkSales: 'Vendas da Rede',
    commissions: 'Comissões',
    dividends: 'Dividendos',
    totalMonth: 'Total do Mês',
    totalLifetime: 'Total Acumulado',
    currentTitle: 'Título Atual',
    activityStatus: 'Status de Atividade',
    active: 'Ativo',
    inactive: 'Inativo',
    daysRemaining: '{days} dias restantes',
    lostEarnings: 'Você perdeu R$ {amount} por não estar ativo',
    earningsHistory: 'Histórico de Ganhos',
    buyFirstQuota: 'Compre sua primeira cota',
  },

  // ========== NETWORK ==========
  network: {
    title: 'Minha Rede',
    totalMembers: 'Total de Membros',
    directMembers: 'Membros Diretos',
    filterByTitle: 'Filtrar por Título',
    memberDetails: 'Detalhes do Membro',
    contact: 'Contato',
    quotasSold: 'Cotas Vendidas',
    totalCommissions: 'Comissões Totais',
    scoringComingSoon: 'Sistema de pontuação em breve',
  },

  // ========== QUOTAS ==========
  quotas: {
    title: 'Cotas',
    currentValue: 'Valor Atual da Cota',
    packages: 'Pacotes',
    buy: 'Comprar',
    quantity: 'Quantidade',
    unitPrice: 'Preço Unitário',
    totalPrice: 'Preço Total',
    purchasedQuotas: 'Cotas Compradas',
    splitQuotas: 'Cotas por Split',
    totalQuotas: 'Total de Cotas',
    bonusNote10: 'A partir de 10 cotas: benefícios especiais',
    bonusNote60: 'A partir de 60 cotas: direito a moradia',
    faq: 'Perguntas Frequentes',
  },

  // ========== CHECKOUT ==========
  checkout: {
    title: 'Comprar Cotas',
    selectQuantity: 'Selecione a Quantidade',
    orderSummary: 'Resumo do Pedido',
    paymentInstructions: 'Instruções de Pagamento',
    confirmPurchase: 'Confirmar Compra',
    purchaseSuccess: 'Compra Realizada!',
    congratulations: 'Parabéns!',
    orderCreated: 'Seu pedido foi criado com sucesso.',
    awaitingPayment: 'Aguardando confirmação de pagamento.',
  },

  // ========== ONBOARDING ==========
  onboarding: {
    registerMember: 'Cadastrar Novo Membro',
    fullName: 'Nome Completo',
    cpf: 'CPF',
    phone: 'Telefone',
    city: 'Cidade',
    state: 'Estado',
    pixKey: 'Chave Pix',
    registrationSuccess: 'Cadastro Realizado!',
    memberId: 'ID do Membro',
    nextSteps: 'Próximos Passos',
  },

  // ========== ADMIN ==========
  admin: {
    dashboard: 'Painel Admin',
    payouts: 'Pagamentos',
    financialConfig: 'Configuração Financeira',
    totalUsers: 'Total de Usuários',
    totalQuotasSold: 'Cotas Vendidas',
    totalRevenue: 'Receita Total',
    selectPeriod: 'Selecionar Período',
    payoutList: 'Lista de Pagamentos',
    markAsPaid: 'Marcar como Pago',
    exportCsv: 'Exportar CSV',
    totalDue: 'Total a Pagar',
    totalPaid: 'Total Pago',
    pending: 'Pendente',
    companyProfit: 'Lucro da Empresa',
    distributionPercentage: 'Percentual de Distribuição',
    listOpen: 'Lista Aberta',
    listClosed: 'Lista Fechada',
  },

  // ========== TITLES ==========
  titles: {
    none: 'Sem Título',
    bronze: 'Bronze',
    silver: 'Prata',
    gold: 'Ouro',
    diamond: 'Diamante',
  },

  // ========== PARTNER LEVELS ==========
  partnerLevels: {
    socio: 'Sócio',
    platinum: 'Platinum',
    vip: 'VIP',
    imperial: 'Imperial',
  },

  // ========== BONUS TYPES ==========
  bonusTypes: {
    firstPurchase: 'Bônus Primeira Compra',
    referral: 'Bônus Indicação',
    repurchase: 'Bônus Recompra',
    team: 'Bônus Equipe',
    leadership: 'Bônus Liderança',
    dividend: 'Dividendos',
  },

  // ========== VALIDATION ==========
  validation: {
    required: '{field} é obrigatório',
    email: 'E-mail inválido',
    minLength: '{field} deve ter pelo menos {min} caracteres',
    maxLength: '{field} deve ter no máximo {max} caracteres',
    cpfInvalid: 'CPF inválido',
    phoneInvalid: 'Telefone inválido',
    passwordsMatch: 'As senhas devem ser iguais',
  },
};
