<template>
  <div class="network-filters">
    <button
      v-for="f in filtersWithCounts"
      :key="f.key"
      :class="['network-filters__btn', { 'network-filters__btn--active': modelValue === f.key }]"
      @click="emit('update:modelValue', f.key)"
    >
      <font-awesome-icon :icon="f.icon" class="network-filters__icon" />
      {{ f.label }}
      <span v-if="f.count !== undefined" class="network-filters__count">{{ f.count }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type NetworkFilter = 'all' | 'active' | 'inactive' | 'expiring';

interface Props {
  modelValue: NetworkFilter;
  counts: Record<NetworkFilter, number>;
}

const props = defineProps<Props>();
const emit = defineEmits<{ 'update:modelValue': [value: NetworkFilter] }>();

const FILTER_DEFS = [
  { key: 'all'      as NetworkFilter, label: 'Todos',          icon: 'users'        },
  { key: 'active'   as NetworkFilter, label: 'Ativos',          icon: 'circle-check' },
  { key: 'inactive' as NetworkFilter, label: 'Inativos',        icon: 'circle-xmark' },
  { key: 'expiring' as NetworkFilter, label: 'Quase Expirando', icon: 'clock'        },
];

const filtersWithCounts = computed(() =>
  FILTER_DEFS.map(f => ({ ...f, count: props.counts[f.key] })),
);
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.network-filters {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-2;

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-2 $spacing-4;
    border-radius: $radius-full;
    border: 1.5px solid $border-default;
    background: $bg-primary;
    color: $text-secondary;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: $primary-400;
      color: $primary-700;
      background: $primary-50;
    }

    &--active {
      border-color: $primary-500;
      background: $primary-500;
      color: white;

      &:hover {
        background: $primary-600;
        border-color: $primary-600;
        color: white;
      }

      .network-filters__count {
        background: rgba(255, 255, 255, 0.25);
        color: white;
      }
    }
  }

  &__icon {
    font-size: 0.8125rem;
  }

  &__count {
    background: $neutral-200;
    color: $text-secondary;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0 $spacing-2;
    border-radius: $radius-full;
    min-width: 20px;
    text-align: center;
    transition: all 0.15s ease;
  }
}
</style>
