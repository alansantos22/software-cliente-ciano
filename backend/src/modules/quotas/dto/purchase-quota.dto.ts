import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PurchaseQuotaDto {
  @IsInt()
  @Min(1)
  quantity: number;

  // O método de pagamento (PIX/cartão/parcelas) é escolhido na própria página
  // do PagBank, não no nosso app. Mantido opcional só por compatibilidade.
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
