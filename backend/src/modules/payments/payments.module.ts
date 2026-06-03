import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PagBankService } from './pagbank.service';

/**
 * Encapsula a integração com o gateway de pagamento (PagBank/PagSeguro).
 * Exporta o PagBankService para que o QuotasModule possa criar checkouts.
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
  providers: [PagBankService],
  exports: [PagBankService],
})
export class PaymentsModule {}
