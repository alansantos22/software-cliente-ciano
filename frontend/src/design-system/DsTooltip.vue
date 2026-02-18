<template>
  <div
    class="ds-tooltip"
    @mouseenter="show = true"
    @mouseleave="show = false"
    @focus="show = true"
    @blur="show = false"
  >
    <slot />
    <Transition name="tooltip">
      <div
        v-if="show && content"
        :class="['ds-tooltip__content', `ds-tooltip__content--${position}`]"
        role="tooltip"
      >
        {{ content }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

withDefaults(defineProps<Props>(), {
  position: 'top',
});

const show = ref(false);
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;

.ds-tooltip {
  position: relative;
  display: inline-block;

  &__content {
    position: absolute;
    z-index: 1000;
    padding: $spacing-2 $spacing-3;
    background: $neutral-900;
    color: white;
    font-size: 0.8125rem;
    border-radius: 6px;
    white-space: nowrap;
    pointer-events: none;

    &::after {
      content: '';
      position: absolute;
      border: 6px solid transparent;
    }

    &--top {
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);

      &::after {
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-top-color: $neutral-900;
      }
    }

    &--bottom {
      top: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);

      &::after {
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-bottom-color: $neutral-900;
      }
    }

    &--left {
      right: calc(100% + 8px);
      top: 50%;
      transform: translateY(-50%);

      &::after {
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        border-left-color: $neutral-900;
      }
    }

    &--right {
      left: calc(100% + 8px);
      top: 50%;
      transform: translateY(-50%);

      &::after {
        right: 100%;
        top: 50%;
        transform: translateY(-50%);
        border-right-color: $neutral-900;
      }
    }
  }
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
