<template>
  <div :class="['ds-alert', `ds-alert--${type}`]">
    <span class="ds-alert__icon">
      <font-awesome-icon :icon="icon" />
    </span>
    <div class="ds-alert__content">
      <strong v-if="title" class="ds-alert__title">{{ title }}</strong>
      <p class="ds-alert__message"><slot /></p>
    </div>
    <button
      v-if="dismissible"
      class="ds-alert__dismiss"
      type="button"
      aria-label="Fechar"
      @click="emit('dismiss')"
    >
      <font-awesome-icon icon="xmark" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  dismissible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  dismissible: false,
});

const emit = defineEmits<{
  dismiss: [];
}>();

const icon = computed(() => {
  const icons: Record<string, string> = {
    info: 'circle-info',
    success: 'circle-check',
    warning: 'triangle-exclamation',
    error: 'circle-xmark',
  };
  return icons[props.type];
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.ds-alert {
  display: flex;
  align-items: flex-start;
  gap: $spacing-3;
  padding: $spacing-4;
  border-radius: $radius-lg;
  border-left: 4px solid;

  &--info {
    background: rgba(var(--info-rgb), 0.1);
    border-color: var(--color-info);
    color: var(--color-info-dark);
  }

  &--success {
    background: rgba(var(--success-rgb), 0.1);
    border-color: var(--color-success);
    color: var(--color-success-dark);
  }

  &--warning {
    background: rgba(var(--warning-rgb), 0.1);
    border-color: var(--color-warning);
    color: var(--color-warning-dark);
  }

  &--error {
    background: rgba(var(--error-rgb), 0.1);
    border-color: var(--color-error);
    color: var(--color-error-dark);
  }

  &__icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
  }

  &__title {
    display: block;
    margin-bottom: $spacing-1;
    font-weight: 600;
  }

  &__message {
    margin: 0;
    line-height: 1.5;
  }

  &__dismiss {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    padding: $spacing-1;
    opacity: 0.7;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 1;
    }
  }
}
</style>
