<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="ds-modal-overlay" @click.self="handleOverlayClick">
        <div :class="['ds-modal', `ds-modal--${size}`]" role="dialog" aria-modal="true">
          <header v-if="title || $slots.header" class="ds-modal__header">
            <slot name="header">
              <h2 class="ds-modal__title">{{ title }}</h2>
            </slot>
            <button
              v-if="closable"
              class="ds-modal__close"
              type="button"
              aria-label="Fechar"
              @click="close"
            >
              ✕
            </button>
          </header>

          <div class="ds-modal__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="ds-modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch } from 'vue';

interface Props {
  modelValue: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  closeOnOverlay?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closable: true,
  closeOnOverlay: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

function close() {
  emit('update:modelValue', false);
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    close();
  }
}

// Lock body scroll when modal is open
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.ds-modal-overlay {
  @include overlay(0.5);
  @include flex-center;
  padding: $spacing-4;
}

.ds-modal {
  background: $bg-primary;
  border-radius: $radius-xl;
  box-shadow: $shadow-xl;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &--sm {
    width: 100%;
    max-width: 400px;
  }

  &--md {
    width: 100%;
    max-width: 560px;
  }

  &--lg {
    width: 100%;
    max-width: 800px;
  }

  &--xl {
    width: 100%;
    max-width: 1140px;
  }

  &--full {
    width: calc(100% - #{$spacing-8});
    height: calc(100% - #{$spacing-8});
    max-width: none;
    max-height: none;
    border-radius: $radius-lg;
  }

  &__header {
    @include flex-between;
    padding: $spacing-4 $spacing-6;
    border-bottom: 1px solid $border-light;
  }

  &__title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }

  &__close {
    @include flex-center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    border-radius: $radius-full;
    cursor: pointer;
    color: $text-secondary;
    font-size: 1rem;
    transition: background $transition-fast;

    &:hover {
      background: $neutral-100;
      color: $text-primary;
    }
  }

  &__body {
    padding: $spacing-6;
    overflow-y: auto;
    flex: 1;
  }

  &__footer {
    padding: $spacing-4 $spacing-6;
    border-top: 1px solid $border-light;
    background: $bg-secondary;
  }
}

// Transitions
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;

  .ds-modal {
    transition: transform 0.2s ease;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .ds-modal {
    transform: scale(0.95) translateY(-20px);
  }
}
</style>
