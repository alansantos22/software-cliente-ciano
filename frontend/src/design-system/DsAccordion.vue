<template>
  <div class="ds-accordion">
    <div
      class="ds-accordion__header"
      :class="{ 'ds-accordion__header--open': isOpen }"
      role="button"
      tabindex="0"
      @click="toggle"
      @keydown.enter="toggle"
      @keydown.space.prevent="toggle"
    >
      <slot name="header">
        <span class="ds-accordion__title">{{ title }}</span>
      </slot>
      <span class="ds-accordion__icon">
        {{ isOpen ? '−' : '+' }}
      </span>
    </div>

    <Transition name="accordion">
      <div
        v-show="isOpen"
        ref="contentRef"
        class="ds-accordion__content"
      >
        <div class="ds-accordion__body">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  title?: string;
  defaultOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultOpen: false,
});

const isOpen = ref(props.defaultOpen);
const contentRef = ref<HTMLElement | null>(null);

function toggle() {
  isOpen.value = !isOpen.value;
}

// Animate height
watch(isOpen, (open) => {
  if (!contentRef.value) return;

  if (open) {
    contentRef.value.style.height = contentRef.value.scrollHeight + 'px';
    setTimeout(() => {
      if (contentRef.value) contentRef.value.style.height = 'auto';
    }, 200);
  } else {
    contentRef.value.style.height = contentRef.value.scrollHeight + 'px';
    requestAnimationFrame(() => {
      if (contentRef.value) contentRef.value.style.height = '0px';
    });
  }
});

defineExpose({ isOpen, toggle });
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.ds-accordion {
  border: 1px solid $border-light;
  border-radius: $radius-lg;
  overflow: hidden;

  & + & {
    margin-top: -1px;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  &__header {
    @include flex-between;
    padding: $spacing-4;
    background: $bg-primary;
    cursor: pointer;
    user-select: none;
    transition: background $transition-fast;

    &:hover {
      background: $bg-secondary;
    }

    &--open {
      border-bottom: 1px solid $border-light;
    }

    &:focus-visible {
      @include focus-ring;
    }
  }

  &__title {
    font-weight: 500;
    color: $text-primary;
  }

  &__icon {
    @include flex-center;
    width: 24px;
    height: 24px;
    font-size: 1.25rem;
    color: $text-secondary;
    transition: transform $transition-fast;
  }

  &__content {
    overflow: hidden;
    transition: height 0.2s ease-out;
  }

  &__body {
    padding: $spacing-4;
    color: $text-secondary;
    line-height: 1.6;
  }
}

.accordion-enter-active,
.accordion-leave-active {
  transition: opacity 0.2s ease;
}

.accordion-enter-from,
.accordion-leave-to {
  opacity: 0;
}
</style>
