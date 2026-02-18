<template>
  <button
    :class="[
      'ds-button',
      `ds-button--${variant}`,
      `ds-button--${size}`,
      { 'ds-button--loading': loading, 'ds-button--icon-only': iconOnly }
    ]"
    :disabled="disabled || loading"
    :type="type"
    @click="emit('click', $event)"
  >
    <span v-if="loading" class="ds-button__spinner">
      <svg class="spinner" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" />
      </svg>
    </span>
    <span v-if="$slots.icon && !loading" class="ds-button__icon">
      <slot name="icon" />
    </span>
    <span v-if="$slots.default && !iconOnly" class="ds-button__text">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  loading?: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  loading: false,
  disabled: false,
  iconOnly: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.ds-button {
  @include button-base;
  position: relative;
  font-weight: 500;

  // === VARIANTS ===
  &--primary {
    background: $primary-500;
    color: white;

    &:hover:not(:disabled) {
      background: $primary-600;
    }

    &:active:not(:disabled) {
      background: $primary-700;
    }
  }

  &--secondary {
    background: $secondary-500;
    color: white;

    &:hover:not(:disabled) {
      background: $secondary-600;
    }
  }

  &--outline {
    background: transparent;
    color: $primary-600;
    border: 2px solid $primary-500;

    &:hover:not(:disabled) {
      background: $primary-50;
    }
  }

  &--ghost {
    background: transparent;
    color: $text-secondary;

    &:hover:not(:disabled) {
      background: $neutral-100;
      color: $text-primary;
    }
  }

  &--danger {
    background: $error;
    color: white;

    &:hover:not(:disabled) {
      background: $error-dark;
    }
  }

  // === SIZES ===
  &--sm {
    height: $button-height-sm;
    padding: 0 $spacing-3;
    font-size: 0.875rem;
  }

  &--md {
    height: $button-height-md;
    padding: 0 $spacing-4;
    font-size: 1rem;
  }

  &--lg {
    height: $button-height-lg;
    padding: 0 $spacing-6;
    font-size: 1.125rem;
  }

  // === STATES ===
  &--loading {
    pointer-events: none;

    .ds-button__text {
      opacity: 0;
    }
  }

  &--icon-only {
    aspect-ratio: 1;
    padding: 0;

    &.ds-button--sm {
      width: $button-height-sm;
    }

    &.ds-button--md {
      width: $button-height-md;
    }

    &.ds-button--lg {
      width: $button-height-lg;
    }
  }

  &__spinner {
    position: absolute;
    display: flex;

    .spinner {
      width: 20px;
      height: 20px;
      animation: spin 1s linear infinite;

      circle {
        stroke-dasharray: 60;
        stroke-dashoffset: 45;
        stroke-linecap: round;
      }
    }
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
