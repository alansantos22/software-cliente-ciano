<template>
  <div ref="dropdownRef" class="ds-dropdown">
    <div ref="triggerRef" class="ds-dropdown__trigger" @click="toggle">
      <slot name="trigger" />
    </div>

    <Transition name="dropdown">
      <div
        v-if="isOpen"
        :class="['ds-dropdown__menu', `ds-dropdown__menu--${align}`]"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Props {
  align?: 'left' | 'right';
}

withDefaults(defineProps<Props>(), {
  align: 'left',
});

const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

function toggle() {
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

// Click outside handler
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (dropdownRef.value && !dropdownRef.value.contains(target)) {
    close();
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

defineExpose({ close, isOpen });
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.ds-dropdown {
  position: relative;
  display: inline-block;

  &__trigger {
    cursor: pointer;
  }

  &__menu {
    position: absolute;
    top: calc(100% + $spacing-2);
    z-index: $z-dropdown;
    min-width: 180px;
    background: $bg-primary;
    border-radius: $radius-lg;
    box-shadow: $shadow-lg;
    border: 1px solid $border-light;
    padding: $spacing-2;
    overflow: hidden;

    &--left {
      left: 0;
    }

    &--right {
      right: 0;
    }
  }
}

// Shared dropdown item style (use in slot elements)
:deep(.ds-dropdown-item) {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-3;
  border-radius: $radius-md;
  cursor: pointer;
  transition: background $transition-fast;
  color: $text-primary;
  text-decoration: none;
  font-size: 0.9375rem;

  &:hover {
    background: $neutral-100;
  }
}

:deep(.ds-dropdown-item--danger) {
  color: $error;

  &:hover {
    background: rgba($error, 0.1);
  }
}

// Transitions
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
