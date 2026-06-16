import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InfinitePayService } from './infinitepay.service';

/**
 * Encapsula a integração com o gateway de pagamento (InfinitePay).
 * Exporta o InfinitePayService para que o QuotasModule possa criar checkouts.
 * Não depende do QuotasModule (a confirmação do pagamento é orquestrada
 * pelo QuotasService, que importa este módulo — relação unidirecional).
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 0,
    }),
  ],
  providers: [InfinitePayService],
  exports: [InfinitePayService],
})
export class PaymentsModule {}
