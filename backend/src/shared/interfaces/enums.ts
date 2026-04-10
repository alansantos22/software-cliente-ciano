export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export enum UserTitle {
  NONE = 'none',
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  DIAMOND = 'diamond',
}

export enum PartnerLevel {
  SOCIO = 'socio',
  PLATINUM = 'platinum',
  VIP = 'vip',
  IMPERIAL = 'imperial',
}

export enum TransactionType {
  PURCHASE = 'purchase',
  BONUS = 'bonus',
  WITHDRAWAL = 'withdrawal',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
  ADMIN_GRANT = 'admin_grant',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum BonusType {
  FIRST_PURCHASE = 'firstPurchase',
  REPURCHASE = 'repurchase',
  TEAM = 'team',
  LEADERSHIP = 'leadership',
  DIVIDEND = 'dividend',
}

export enum EarningStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PixKeyType {
  CPF = 'cpf',
  EMAIL = 'email',
  PHONE = 'phone',
  RANDOM = 'random',
}

export enum ClosingDayMode {
  FIXED = 'fixed',
  LAST_DAY = 'last_day',
  FIRST_NEXT_MONTH = 'first_next_month',
}

export enum SplitEventType {
  PRICE_INCREASE = 'price_increase',
  SPLIT = 'split',
}

export enum TitleReqType {
  PESSOAS_ATIVAS = 'pessoas_ativas',
  INDICADO = 'indicado',
  LINHAS = 'linhas',
}

export enum TitleReqLevel {
  QUALQUER = 'qualquer',
  BRONZE = 'bronze',
  PRATA = 'prata',
  OURO = 'ouro',
}
