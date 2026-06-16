import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PurchaseQuotaDto {
  @IsInt()
  @Min(1)
  quantity: number;

  // O método de pagamento (PIX/cartão/parcelas) é escolhido na própria página
  // da InfinitePay, não no nosso app. Mantido opcional só por compatibilidade.
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║ TEST_PAYMENT_5_REAIS — REMOVER ANTES DE IR PARA PRODUÇÃO              ║
  // ║ Quando true, o valor ENVIADO à InfinitePay é forçado p/ R$5,00 (apenas║
  // ║ para testar o fluxo real de cartão/PIX sem pagar o preço cheio). As   ║
  // ║ cotas continuam sendo as reais. NÃO DEVE EXISTIR EM PRODUÇÃO.         ║
  // ╚══════════════════════════════════════════════════════════════════════╝
  @IsOptional()
  @IsBoolean()
  testMode?: boolean;
}
