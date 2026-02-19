<template>
  <div class="status-widget" :class="`status-widget--${status}`">
    <div class="status-widget__icon">
      <font-awesome-icon :icon="statusIcon" />
      <span v-if="status !== 'active'" class="status-widget__pulse" />
    </div>
    <div class="status-widget__body">
      <span class="status-widget__title">{{ statusTitle }}</span>
      <span class="status-widget__detail">{{ statusDetail }}</span>
    </div>
    <div v-if="status !== 'active'" class="status-widget__cta">
      <button class="status-widget__btn" @click="$emit('renew')">
        Renovar Agora
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type AccountStatus = 'active' | 'warning' | 'critical';

const props = defineProps<{
  status: AccountStatus;
  daysRemaining: number;
}>();

defineEmits<{ renew: [] }>();

const statusIcon = computed(() => {
  if (props.status === 'active') return 'shield-halved';
  if (props.status === 'warning') return 'triangle-exclamation';
  return 'circle-xmark';
});

const statusTitle = computed(() => {
  if (props.status === 'active') return 'Conta Ativa';
  if (props.status === 'warning') return 'Atenção!';
  return 'Risco de Inatividade';
});

const statusDetail = computed(() => {
  if (props.status === 'active')
    return `Renovação necessária em ${props.daysRemaining} dias`;
  if (props.status === 'warning')
    return `${props.daysRemaining} dias para inatividade - compre uma cota`;
  return `Apenas ${props.daysRemaining} dia(s)! Seus bônus estão em risco`;
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;
@use 'sass:color';

@keyframes pulse-ring {
  0%   { transform: scale(1); opacity: 0.8; }
  70%  { transform: scale(1.6); opacity: 0; }
  100% { transform: scale(1.6); opacity: 0; }
}

.status-widget {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-3 $spacing-4;
  border-radius: $radius-lg;
  border: 1.5px solid;

  &--active {
    background: rgba($success, 0.06);
    border-color: rgba($success, 0.3);
    .status-widget__icon { color: $success; background: rgba($success, 0.12); }
    .status-widget__title { color: $success-dark; }
  }

  &--warning {
    background: rgba($warning, 0.08);
    border-color: rgba($warning, 0.4);
    .status-widget__icon { color: $warning; background: rgba($warning, 0.12); }
    .status-widget__title { color: color.adjust($warning, $lightness: -10%); }
  }

  &--critical {
    background: rgba($error, 0.08);
    border-color: rgba($error, 0.4);
    animation: none;
    .status-widget__icon { color: $error; background: rgba($error, 0.12); }
    .status-widget__title { color: $error; }
  }

  &__icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    font-size: 1.125rem;
    flex-shrink: 0;
  }

  &__pulse {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid currentColor;
    animation: pulse-ring 1.8s ease-out infinite;
  }

  &__body {
    @include flex-column;
    gap: 2px;
    flex: 1;
  }

  &__title {
    font-size: 0.875rem;
    font-weight: 700;
  }

  &__detail {
    font-size: 0.75rem;
    color: $text-secondary;
  }

  &__cta {
    flex-shrink: 0;
  }

  &__btn {
    padding: $spacing-1 $spacing-3;
    border: none;
    border-radius: $radius-sm;
    background: $error;
    color: #fff;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;

    .status-widget--warning & {
      background: $warning;
      color: $neutral-900;
    }

    &:hover {
      filter: brightness(1.1);
    }
  }
}
</style>
