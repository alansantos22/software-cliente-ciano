<template>
  <DsTooltip :content="copied ? successText : tooltipText" position="top">
    <button
      type="button"
      :class="['ds-copy-button', { 'ds-copy-button--copied': copied }]"
      @click="copy"
    >
      <span class="ds-copy-button__icon">
        <font-awesome-icon :icon="copied ? 'check' : 'copy'" />
      </span>
      <span v-if="showLabel" class="ds-copy-button__label">
        {{ copied ? 'Copiado!' : label }}
      </span>
    </button>
  </DsTooltip>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DsTooltip from './DsTooltip.vue';

interface Props {
  text: string;
  label?: string;
  tooltipText?: string;
  successText?: string;
  showLabel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Copiar',
  tooltipText: 'Copiar para área de transferência',
  successText: 'Copiado!',
  showLabel: false,
});

const emit = defineEmits<{
  copied: [text: string];
}>();

const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(props.text);
    copied.value = true;
    emit('copied', props.text);

    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Falha ao copiar:', err);
  }
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.ds-copy-button {
  @include flex-center;
  gap: $spacing-2;
  padding: $spacing-2;
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;
  color: var(--text-secondary);

  &:hover {
    background: var(--neutral-100);
    border-color: var(--primary-500);
    color: var(--primary-600);
  }

  &--copied {
    background: var(--color-success);
    border-color: var(--color-success);
    color: white;

    &:hover {
      background: var(--color-success-dark);
    }
  }

  &__icon {
    font-size: 1rem;
  }

  &__label {
    font-size: 0.875rem;
    font-weight: 500;
  }
}
</style>
