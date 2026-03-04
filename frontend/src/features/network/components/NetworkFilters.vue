<template>
  <div class="network-filters">
    <div class="network-filters__group">
      <span class="network-filters__group-label">Status</span>
      <div class="network-filters__row">
        <button
          v-for="f in statusFilters"
          :key="f.key"
          :class="['network-filters__btn', { 'network-filters__btn--active': modelValue === f.key }]"
          @click="emit('update:modelValue', f.key)"
        >
          <font-awesome-icon :icon="f.icon" class="network-filters__icon" />
          {{ f.label }}
          <span v-if="f.count !== undefined" class="network-filters__count">{{ f.count }}</span>
        </button>
      </div>
    </div>
    <div class="network-filters__group">
      <span class="network-filters__group-label">Título</span>
      <div class="network-filters__row">
        <button
          v-for="f in titleFilters"
          :key="f.key"
          :class="['network-filters__btn', `network-filters__btn--title-${f.titleKey}`, { 'network-filters__btn--active': modelValue === f.key }]"
          @click="emit('update:modelValue', f.key)"
        >
          <font-awesome-icon :icon="f.icon" class="network-filters__icon" />
          {{ f.label }}
          <span v-if="f.count !== undefined" class="network-filters__count">{{ f.count }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type NetworkFilter = 'all' | 'active' | 'inactive' | 'expiring' | 'title-bronze' | 'title-silver' | 'title-gold' | 'title-diamond';

interface Props {
  modelValue: NetworkFilter;
  counts: Record<string, number>;
}

const props = defineProps<Props>();
const emit = defineEmits<{ 'update:modelValue': [value: NetworkFilter] }>();

const STATUS_DEFS = [
  { key: 'all'      as NetworkFilter, label: 'Todos',          icon: 'users'        },
  { key: 'active'   as NetworkFilter, label: 'Ativos',          icon: 'circle-check' },
  { key: 'inactive' as NetworkFilter, label: 'Inativos',        icon: 'circle-xmark' },
  { key: 'expiring' as NetworkFilter, label: 'Quase Expirando', icon: 'clock'        },
];

const TITLE_DEFS = [
  { key: 'title-bronze'  as NetworkFilter, label: 'Bronze',   icon: 'medal',  titleKey: 'bronze'  },
  { key: 'title-silver'  as NetworkFilter, label: 'Prata',    icon: 'medal',  titleKey: 'silver'  },
  { key: 'title-gold'    as NetworkFilter, label: 'Ouro',     icon: 'medal',  titleKey: 'gold'    },
  { key: 'title-diamond' as NetworkFilter, label: 'Diamante', icon: 'gem',    titleKey: 'diamond' },
];

const statusFilters = computed(() =>
  STATUS_DEFS.map(f => ({ ...f, count: props.counts[f.key] })),
);

const titleFilters = computed(() =>
  TITLE_DEFS.map(f => ({ ...f, count: props.counts[f.key] })),
);
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.network-filters {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;

  &__group {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    flex-wrap: wrap;
  }

  &__group-label {
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: $text-tertiary;
    min-width: 40px;
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-2;
  }

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

    // Title-specific colors
    &--title-bronze { &:hover { border-color: #cd7f32; color: #7a4a10; background: #fbe9c5; } }
    &--title-silver { &:hover { border-color: #a0a0a0; color: #4a4a4a; background: #ebebeb; } }
    &--title-gold   { &:hover { border-color: #daa520; color: #7a5800; background: #fff5c2; } }
    &--title-diamond { &:hover { border-color: #00bcd4; color: #007fa3; background: #d9f5fb; } }

    &--title-bronze.network-filters__btn--active { background: #cd7f32; border-color: #cd7f32; }
    &--title-silver.network-filters__btn--active { background: #a0a0a0; border-color: #a0a0a0; }
    &--title-gold.network-filters__btn--active   { background: #daa520; border-color: #daa520; }
    &--title-diamond.network-filters__btn--active { background: #00bcd4; border-color: #00bcd4; }
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
