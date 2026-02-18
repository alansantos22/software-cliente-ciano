<template>
  <div class="ds-empty-state">
    <div class="ds-empty-state__icon">
      <slot name="icon">{{ icon || '📭' }}</slot>
    </div>

    <h3 class="ds-empty-state__title">{{ title }}</h3>

    <p v-if="description" class="ds-empty-state__description">
      {{ description }}
    </p>

    <div v-if="$slots.action" class="ds-empty-state__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  description?: string;
  icon?: string;
}

withDefaults(defineProps<Props>(), {});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.ds-empty-state {
  @include flex-center;
  flex-direction: column;
  text-align: center;
  padding: $spacing-10;

  &__icon {
    font-size: 4rem;
    margin-bottom: $spacing-4;
    opacity: 0.5;
  }

  &__title {
    margin: 0 0 $spacing-2;
    font-size: 1.25rem;
    font-weight: 600;
    color: $text-primary;
  }

  &__description {
    margin: 0;
    max-width: 320px;
    color: $text-secondary;
    line-height: 1.5;
  }

  &__action {
    margin-top: $spacing-6;
  }
}
</style>
