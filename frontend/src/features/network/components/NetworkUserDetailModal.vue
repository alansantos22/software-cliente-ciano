<template>
  <DsModal
    :model-value="modelValue"
    :title="node?.name ?? 'Detalhes do Membro'"
    size="md"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="node" class="user-detail">
      <!-- Avatar + title -->
      <div class="user-detail__hero">
        <div :class="['user-detail__avatar', `user-detail__avatar--${statusClass}`]">
          {{ initials }}
        </div>
        <div class="user-detail__hero-info">
          <h3 class="user-detail__name">{{ node.name }}</h3>
          <div class="user-detail__badges">
            <span class="user-detail__title-badge" :style="titleStyle">{{ titleLabel }}</span>
            <span class="user-detail__partner-badge">{{ partnerLabel }}</span>
          </div>
        </div>
      </div>

      <!-- Status banner -->
      <div :class="['user-detail__status-banner', `user-detail__status-banner--${statusClass}`]">
        <font-awesome-icon :icon="statusIcon" />
        <span>{{ statusText }}</span>
      </div>

      <!-- Contact -->
      <section class="user-detail__section">
        <h4 class="user-detail__section-title">Contato</h4>
        <div class="user-detail__field">
          <span class="user-detail__label">E-mail</span>
          <span class="user-detail__value">{{ node.email }}</span>
        </div>
        <div class="user-detail__field">
          <span class="user-detail__label">Telefone</span>
          <span class="user-detail__value">
            {{ node.phone }}
            <a
              :href="`https://wa.me/55${sanitizedPhone}`"
              target="_blank"
              rel="noopener"
              class="user-detail__whatsapp"
              title="Abrir WhatsApp"
            >
              <font-awesome-icon icon="phone" />
            </a>
          </span>
        </div>
      </section>

      <!-- Quotas & Sales -->
      <section class="user-detail__section">
        <h4 class="user-detail__section-title">Cotas & Vendas</h4>
        <div class="user-detail__grid">
          <div class="user-detail__metric">
            <span class="user-detail__metric-value">{{ node.quotaCount }}</span>
            <span class="user-detail__metric-label">Cotas</span>
          </div>
          <div class="user-detail__metric">
            <span class="user-detail__metric-value">{{ formatCurrency(node.totalVolume) }}</span>
            <span class="user-detail__metric-label">Volume Total</span>
          </div>
          <div class="user-detail__metric">
            <span class="user-detail__metric-value">{{ node.directCount }}</span>
            <span class="user-detail__metric-label">Indicados Diretos</span>
          </div>
          <div class="user-detail__metric">
            <span class="user-detail__metric-value">{{ node.teamCount }}</span>
            <span class="user-detail__metric-label">Total da Equipe</span>
          </div>
        </div>
      </section>

      <!-- Expiry -->
      <section class="user-detail__section">
        <h4 class="user-detail__section-title">Validade</h4>
        <div class="user-detail__field">
          <span class="user-detail__label">Data de expiração</span>
          <span class="user-detail__value">{{ formattedExpiry }}</span>
        </div>
        <div class="user-detail__field">
          <span class="user-detail__label">Dias restantes</span>
          <span :class="['user-detail__value', { 'user-detail__value--danger': daysRemaining <= 15 }]">
            {{ daysRemaining > 0 ? `${daysRemaining} dias` : 'Expirado' }}
          </span>
        </div>
      </section>
    </div>
  </DsModal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { DsModal } from '@/design-system';
import type { NetworkNode } from '@/mocks';

interface Props {
  modelValue: boolean;
  node: NetworkNode | null;
}

const props = defineProps<Props>();

defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const TODAY = new Date('2026-02-18');

// ── Initials ──────────────────────────────────────────────────────────────────
const initials = computed(() => {
  if (!props.node) return '';
  return props.node.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
});

// ── Status ────────────────────────────────────────────────────────────────────
const daysRemaining = computed(() => {
  if (!props.node) return 0;
  const exp = new Date(props.node.expiresAt);
  return Math.ceil((exp.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
});

const statusClass = computed<'active' | 'expiring' | 'inactive'>(() => {
  if (!props.node?.isActive) return 'inactive';
  if (daysRemaining.value <= 15) return 'expiring';
  return 'active';
});

const statusText = computed(() => {
  if (!props.node?.isActive) return 'Inativo';
  if (daysRemaining.value <= 0) return 'Expirado';
  if (daysRemaining.value <= 15) return `Expira em ${daysRemaining.value} dias`;
  return 'Ativo';
});

const statusIcon = computed(() => {
  if (statusClass.value === 'inactive') return 'circle-xmark';
  if (statusClass.value === 'expiring') return 'clock';
  return 'circle-check';
});

// ── Title & Partner ──────────────────────────────────────────────────────────
const TITLE_MAP: Record<string, { color: string; bg: string; label: string }> = {
  none:    { color: '#757575', bg: '#f5f5f5',  label: 'Sem Título' },
  bronze:  { color: '#7a4a10', bg: '#fbe9c5',  label: 'Bronze'     },
  silver:  { color: '#4a4a4a', bg: '#ebebeb',  label: 'Prata'      },
  gold:    { color: '#7a5800', bg: '#fff5c2',  label: 'Ouro'       },
  diamond: { color: '#007fa3', bg: '#d9f5fb',  label: 'Diamante'   },
};

const PARTNER_MAP: Record<string, string> = {
  socio:    'Sócio',
  platinum: 'Platina',
  vip:      'VIP',
  imperial: 'Imperial',
};

const titleStyle = computed(() => {
  const s = TITLE_MAP[props.node?.title ?? 'none'] ?? TITLE_MAP.none;
  return { color: s.color, background: s.bg };
});

const titleLabel = computed(() => (TITLE_MAP[props.node?.title ?? 'none'] ?? TITLE_MAP.none).label);
const partnerLabel = computed(() => PARTNER_MAP[props.node?.partnerLevel ?? 'socio'] ?? 'Sócio');

// ── Helpers ──────────────────────────────────────────────────────────────────
const sanitizedPhone = computed(() =>
  (props.node?.phone ?? '').replace(/\D/g, ''),
);

const formattedExpiry = computed(() => {
  if (!props.node) return '-';
  return new Date(props.node.expiresAt).toLocaleDateString('pt-BR');
});

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.user-detail {
  display: flex;
  flex-direction: column;
  gap: $spacing-5;

  // ── Hero ──────────────────────────────────────────────────────────────────
  &__hero {
    display: flex;
    align-items: center;
    gap: $spacing-4;
  }

  &__avatar {
    width: 56px;
    height: 56px;
    border-radius: $radius-full;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.125rem;
    color: white;
    flex-shrink: 0;
    border: 3px solid transparent;

    &--active   { background: $success; border-color: rgba($success, 0.3); }
    &--expiring { background: $warning; border-color: rgba($warning, 0.3); }
    &--inactive { background: $neutral-400; border-color: rgba($neutral-400, 0.3); }
  }

  &__hero-info {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
  }

  &__name {
    font-size: 1.125rem;
    font-weight: 700;
    color: $text-primary;
    margin: 0;
  }

  &__badges {
    display: flex;
    gap: $spacing-2;
    flex-wrap: wrap;
  }

  &__title-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px $spacing-2;
    border-radius: $radius-full;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  &__partner-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px $spacing-2;
    border-radius: $radius-full;
    font-size: 0.7rem;
    font-weight: 600;
    background: rgba($primary-500, 0.1);
    color: $primary-500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  // ── Status banner ────────────────────────────────────────────────────────
  &__status-banner {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-3 $spacing-4;
    border-radius: $radius-md;
    font-size: 0.875rem;
    font-weight: 600;

    &--active {
      background: rgba($success, 0.1);
      color: $success;
    }
    &--expiring {
      background: rgba($warning, 0.1);
      color: $warning;
    }
    &--inactive {
      background: rgba($error, 0.1);
      color: $error;
    }
  }

  // ── Sections ──────────────────────────────────────────────────────────────
  &__section {
    display: flex;
    flex-direction: column;
    gap: $spacing-3;
  }

  &__section-title {
    font-size: 0.8125rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: $text-secondary;
    margin: 0;
  }

  &__field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: $spacing-3;
  }

  &__label {
    font-size: 0.875rem;
    color: $text-secondary;
  }

  &__value {
    font-size: 0.875rem;
    font-weight: 600;
    color: $text-primary;
    display: flex;
    align-items: center;
    gap: $spacing-2;

    &--danger {
      color: $error;
    }
  }

  &__whatsapp {
    color: #25d366;
    font-size: 0.875rem;
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.7;
    }
  }

  // ── Metrics Grid ──────────────────────────────────────────────────────────
  &__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-3;
  }

  &__metric {
    background: $bg-secondary;
    border-radius: $radius-md;
    padding: $spacing-3;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-1;
    text-align: center;
  }

  &__metric-value {
    font-size: 1.125rem;
    font-weight: 700;
    color: $primary-500;
  }

  &__metric-label {
    font-size: 0.75rem;
    color: $text-secondary;
    font-weight: 500;
  }
}
</style>
