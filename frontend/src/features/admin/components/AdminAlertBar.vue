<template>
  <transition name="alert-slide">
    <div v-if="!dismissed" class="admin-alert-bar" :class="`admin-alert-bar--${urgency}`" role="alert">
      <div class="admin-alert-bar__inner">
        <span class="admin-alert-bar__icon" aria-hidden="true">{{ urgencyIcon }}</span>
        <p class="admin-alert-bar__message">
          O ciclo de pagamento de <strong>{{ referenceMonthLabel }}</strong>
          totaliza <strong>{{ formatCurrency(total) }}</strong>
          para <strong>{{ count }} {{ count === 1 ? 'cotista' : 'cotistas' }}</strong>.
          <span v-if="daysUntilPayment > 0">
            Processar até o <strong>dia {{ paymentDay }}</strong>
            (faltam {{ daysUntilPayment }} {{ daysUntilPayment === 1 ? 'dia' : 'dias' }}).
          </span>
          <span v-else-if="daysUntilPayment === 0">
            <strong>Pagamento é hoje!</strong>
          </span>
          <span v-else class="admin-alert-bar__overdue">
            <strong>Pagamento em atraso ({{ Math.abs(daysUntilPayment) }}d)!</strong>
          </span>
        </p>
        <button class="admin-alert-bar__cta" @click="$emit('go-to-payouts')">
          Processar Pagamentos →
        </button>
        <button
          class="admin-alert-bar__dismiss"
          @click="dismissed = true"
          aria-label="Fechar alerta"
          title="Fechar"
        >
          ✕
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  total: number;
  count: number;
  paymentDay: number;
  referenceMonth: string; // YYYY-MM
}

const props = defineProps<Props>();
defineEmits<{ 'go-to-payouts': [] }>();

const dismissed = ref(false);

const referenceMonthLabel = computed(() => {
  const [year, month] = props.referenceMonth.split('-');
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(Number(year), Number(month) - 1, 1),
  );
});

const daysUntilPayment = computed(() => {
  const today = new Date();
  const payDate = new Date(today.getFullYear(), today.getMonth(), props.paymentDay);
  if (today > payDate) {
    // Payment day has passed this month
    const diff = Math.floor((today.getTime() - payDate.getTime()) / 86_400_000);
    return -diff;
  }
  return Math.ceil((payDate.getTime() - today.getTime()) / 86_400_000);
});

const urgency = computed(() => {
  if (daysUntilPayment.value < 0) return 'overdue';
  if (daysUntilPayment.value <= 2) return 'urgent';
  return 'normal';
});

const urgencyIcon = computed(() => {
  if (urgency.value === 'overdue') return '🔴';
  if (urgency.value === 'urgent') return '🟡';
  return '📅';
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.admin-alert-bar {
  background: linear-gradient(135deg, #e8f4fd, #d0eaf8);
  border: 1px solid $info;
  border-left: 4px solid $info;

  &--urgent {
    background: linear-gradient(135deg, #fff3cd, #ffe8a1);
    border-color: $warning;
    border-left-color: $warning;

    .admin-alert-bar__message { color: #7a5a00; }
    .admin-alert-bar__cta { background: $warning; }
  }

  &--overdue {
    background: linear-gradient(135deg, #fdecea, #fcc);
    border-color: $error;
    border-left-color: $error;

    .admin-alert-bar__message { color: #8b0000; strong { color: #5a0000; } }
    .admin-alert-bar__cta { background: $error; }
  }
  border-radius: $radius-md;
  margin-bottom: $spacing-5;
  overflow: hidden;

  &__inner {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    padding: $spacing-3 $spacing-5;
    flex-wrap: wrap;

    @media (max-width: 768px) {
      padding: $spacing-3 $spacing-4;
    }
  }

  &__icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  &__overdue {
    font-weight: 700;
  }

  &__message {
    flex: 1;
    margin: 0;
    font-size: 0.9rem;
    color: #1a3a5c;
    min-width: 200px;

    strong {
      color: #0d2540;
    }
  }

  &__cta {
    padding: $spacing-2 $spacing-4;
    background: $info;
    color: white;
    border: none;
    border-radius: $radius-md;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.2s;

    &:hover {
      background: $warning-dark;
    }
  }

  &__dismiss {
    background: none;
    border: none;
    color: #1a3a5c;
    cursor: pointer;
    padding: $spacing-1 $spacing-2;
    border-radius: $radius-sm;
    font-size: 0.875rem;
    line-height: 1;
    transition: background 0.15s;
    flex-shrink: 0;

    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
  }
}

// Transition
.alert-slide-enter-active,
.alert-slide-leave-active {
  transition: all 0.3s ease;
  max-height: 120px;
}

.alert-slide-enter-from,
.alert-slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
}
</style>
