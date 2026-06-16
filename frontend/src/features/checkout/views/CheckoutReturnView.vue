<template>
  <div class="return-view">
    <div class="return-card">
      <!-- Aguardando confirmação -->
      <template v-if="state === 'pending'">
        <div class="return-card__spinner">
          <font-awesome-icon :icon="['fas', 'rotate']" spin />
        </div>
        <h1>Confirmando seu pagamento…</h1>
        <p>
          Estamos aguardando a confirmação da InfinitePay. Isso costuma levar alguns
          segundos para PIX. Não feche esta página.
        </p>
      </template>

      <!-- Pagamento confirmado (redireciona em seguida) -->
      <template v-else-if="state === 'paid'">
        <div class="return-card__icon return-card__icon--success">
          <font-awesome-icon :icon="['fas', 'circle-check']" />
        </div>
        <h1>Pagamento confirmado!</h1>
        <p>Suas cotas foram creditadas. Redirecionando…</p>
      </template>

      <!-- Falha (recusado / expirado / cancelado) -->
      <template v-else-if="state === 'failed'">
        <div class="return-card__icon return-card__icon--error">
          <font-awesome-icon :icon="['fas', 'circle-xmark']" />
        </div>
        <h1>Pagamento não concluído</h1>
        <p>{{ failedMessage }}</p>
        <DsButton variant="primary" @click="goToCheckout">Tentar novamente</DsButton>
      </template>

      <!-- Demorou demais (continua pendente) -->
      <template v-else>
        <div class="return-card__icon return-card__icon--warning">
          <font-awesome-icon :icon="['fas', 'clock']" />
        </div>
        <h1>Ainda processando</h1>
        <p>
          Seu pagamento ainda não foi confirmado. Assim que a InfinitePay confirmar,
          suas cotas serão creditadas automaticamente — você pode acompanhar pelo
          seu histórico de transações.
        </p>
        <DsButton variant="primary" @click="goToDashboard">Ir para o painel</DsButton>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { quotasService } from '@/shared/services/quotas.service';
import { useAuthStore } from '@/shared/stores';
import { DsButton } from '@/design-system';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

type ReturnState = 'pending' | 'paid' | 'failed' | 'timeout';
const state = ref<ReturnState>('pending');
const failedStatus = ref('');

// Configuração do polling: tenta por ~90s (30 tentativas a cada 3s).
const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 30;
let attempts = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

const transactionId = computed<string>(() => {
  const fromQuery = route.query.txn;
  if (typeof fromQuery === 'string' && fromQuery) return fromQuery;
  return sessionStorage.getItem('ciano:lastTxn') ?? '';
});

const failedMessage = computed(() => {
  switch (failedStatus.value) {
    case 'declined':
      return 'O pagamento foi recusado. Verifique os dados ou tente outra forma de pagamento.';
    case 'expired':
      return 'O tempo para pagamento expirou. Inicie uma nova compra.';
    case 'cancelled':
      return 'O pagamento foi cancelado. Você pode iniciar uma nova compra quando quiser.';
    default:
      return 'Não foi possível concluir o pagamento. Tente novamente.';
  }
});

async function poll() {
  const id = transactionId.value;
  if (!id) {
    state.value = 'failed';
    failedStatus.value = 'declined';
    return;
  }

  try {
    const { data } = await quotasService.getPaymentStatus(id);
    const status = data?.status as string;

    if (status === 'completed') {
      state.value = 'paid';
      sessionStorage.removeItem('ciano:lastTxn');
      // Atualiza o saldo de cotas do usuário antes de redirecionar.
      try { await authStore.fetchUser(); } catch { /* noop */ }
      setTimeout(() => {
        router.replace({
          name: 'checkout-confirmation',
          params: { transactionId: id },
          query: { quotas: data?.quantity ?? 1 },
        });
      }, 1200);
      return;
    }

    if (status === 'declined' || status === 'expired' || status === 'cancelled') {
      state.value = 'failed';
      failedStatus.value = status;
      sessionStorage.removeItem('ciano:lastTxn');
      return;
    }
  } catch {
    // Ignora erro pontual de rede; continua tentando até o limite.
  }

  attempts += 1;
  if (attempts >= MAX_ATTEMPTS) {
    state.value = 'timeout';
    return;
  }
  timer = setTimeout(poll, POLL_INTERVAL_MS);
}

function goToCheckout() {
  router.replace({ name: 'checkout' });
}

function goToDashboard() {
  router.replace({ name: 'dashboard' });
}

onMounted(poll);
onUnmounted(() => {
  if (timer) clearTimeout(timer);
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.return-view {
  min-height: 100vh;
  @include flex-center;
  background: #f8fafc;
  padding: $spacing-6;
}

.return-card {
  background: white;
  border-radius: $radius-xl;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
  padding: $spacing-8 $spacing-6;
  max-width: 480px;
  width: 100%;
  text-align: center;
  @include flex-column;
  align-items: center;
  gap: $spacing-4;

  h1 {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--neutral-900);
    margin: 0;
  }

  p {
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.5;
    margin: 0;
  }

  &__spinner {
    font-size: 3rem;
    color: var(--primary-500);
  }

  &__icon {
    font-size: 3.5rem;

    &--success { color: var(--color-success); }
    &--error { color: var(--color-danger, #dc2626); }
    &--warning { color: var(--color-warning, #d97706); }
  }
}
</style>
