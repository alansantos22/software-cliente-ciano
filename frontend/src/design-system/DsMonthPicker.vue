<template>
  <div class="ds-month-picker">
    <label v-if="label" class="ds-month-picker__label">{{ label }}</label>

    <div class="ds-month-picker__controls">
      <button
        type="button"
        class="ds-month-picker__nav"
        :disabled="isAtMin"
        @click="prev"
      >
        ←
      </button>

      <button
        type="button"
        class="ds-month-picker__display"
        @click="toggleDropdown"
      >
        {{ formattedMonth }}
      </button>

      <button
        type="button"
        class="ds-month-picker__nav"
        :disabled="isAtMax"
        @click="next"
      >
        →
      </button>
    </div>

    <Transition name="dropdown">
      <div v-if="showDropdown" class="ds-month-picker__dropdown">
        <div class="ds-month-picker__year-nav">
          <button type="button" @click="prevYear">←</button>
          <span>{{ displayYear }}</span>
          <button type="button" @click="nextYear">→</button>
        </div>

        <div class="ds-month-picker__months">
          <button
            v-for="(name, idx) in monthNames"
            :key="idx"
            type="button"
            :class="[
              'ds-month-picker__month',
              {
                'ds-month-picker__month--selected': isSelectedMonth(idx),
                'ds-month-picker__month--disabled': isDisabledMonth(idx),
              },
            ]"
            :disabled="isDisabledMonth(idx)"
            @click="selectMonth(idx)"
          >
            {{ name }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

interface Props {
  modelValue: string; // Format: 'YYYY-MM'
  label?: string;
  min?: string;
  max?: string;
  locale?: string;
}

const props = withDefaults(defineProps<Props>(), {
  locale: 'pt-BR',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const showDropdown = ref(false);
const displayYear = ref(new Date().getFullYear());

const monthNames = computed(() => {
  const formatter = new Intl.DateTimeFormat(props.locale, { month: 'short' });
  return Array.from({ length: 12 }, (_, i) => {
    return formatter.format(new Date(2000, i, 1)).replace('.', '');
  });
});

const currentYear = computed(() => {
  const parts = props.modelValue?.split('-');
  return parts && parts[0] ? parseInt(parts[0]) : new Date().getFullYear();
});

const currentMonth = computed(() => {
  const parts = props.modelValue?.split('-');
  return parts && parts[1] ? parseInt(parts[1]) - 1 : new Date().getMonth();
});

const formattedMonth = computed(() => {
  const date = new Date(currentYear.value, currentMonth.value);
  return new Intl.DateTimeFormat(props.locale, { month: 'long', year: 'numeric' }).format(date);
});

const minDate = computed(() => props.min ? parseDate(props.min) : null);
const maxDate = computed(() => props.max ? parseDate(props.max) : null);

const isAtMin = computed(() => {
  if (!minDate.value) return false;
  return currentYear.value === minDate.value.year && currentMonth.value === minDate.value.month;
});

const isAtMax = computed(() => {
  if (!maxDate.value) return false;
  return currentYear.value === maxDate.value.year && currentMonth.value === maxDate.value.month;
});

function parseDate(str: string): { year: number; month: number } {
  const [year, month] = str.split('-').map(Number);
  return { year: year ?? 0, month: (month ?? 1) - 1 };
}

function formatValue(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function prev() {
  let year = currentYear.value;
  let month = currentMonth.value - 1;
  if (month < 0) {
    month = 11;
    year--;
  }
  emit('update:modelValue', formatValue(year, month));
}

function next() {
  let year = currentYear.value;
  let month = currentMonth.value + 1;
  if (month > 11) {
    month = 0;
    year++;
  }
  emit('update:modelValue', formatValue(year, month));
}

function prevYear() {
  displayYear.value--;
}

function nextYear() {
  displayYear.value++;
}

function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
  if (showDropdown.value) {
    displayYear.value = currentYear.value;
  }
}

function selectMonth(monthIdx: number) {
  emit('update:modelValue', formatValue(displayYear.value, monthIdx));
  showDropdown.value = false;
}

function isSelectedMonth(monthIdx: number): boolean {
  return displayYear.value === currentYear.value && monthIdx === currentMonth.value;
}

function isDisabledMonth(monthIdx: number): boolean {
  const checkDate = { year: displayYear.value, month: monthIdx };

  if (minDate.value && minDate.value.year !== undefined) {
    if (checkDate.year < minDate.value.year) return true;
    if (checkDate.year === minDate.value.year && checkDate.month < minDate.value.month) return true;
  }

  if (maxDate.value && maxDate.value.year !== undefined) {
    if (checkDate.year > maxDate.value.year) return true;
    if (checkDate.year === maxDate.value.year && checkDate.month > maxDate.value.month) return true;
  }

  return false;
}

// Close on outside click
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.ds-month-picker')) {
    showDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

watch(() => props.modelValue, () => {
  displayYear.value = currentYear.value;
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.ds-month-picker {
  position: relative;
  display: inline-block;

  &__label {
    display: block;
    margin-bottom: $spacing-2;
    font-weight: 500;
    color: $text-primary;
  }

  &__controls {
    display: flex;
    align-items: center;
    gap: $spacing-2;
  }

  &__nav {
    @include flex-center;
    width: 36px;
    height: 36px;
    border: 1px solid $border-default;
    border-radius: $radius-md;
    background: $bg-primary;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      background: $primary-50;
      border-color: $primary-500;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__display {
    padding: $spacing-2 $spacing-4;
    min-width: 160px;
    border: 1px solid $border-default;
    border-radius: $radius-md;
    background: $bg-primary;
    text-transform: capitalize;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      border-color: $primary-500;
    }
  }

  &__dropdown {
    position: absolute;
    top: calc(100% + $spacing-2);
    left: 50%;
    transform: translateX(-50%);
    z-index: $z-dropdown;
    background: $bg-primary;
    border: 1px solid $border-light;
    border-radius: $radius-lg;
    box-shadow: $shadow-lg;
    padding: $spacing-4;
    min-width: 280px;
  }

  &__year-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-4;

    button {
      @include flex-center;
      width: 32px;
      height: 32px;
      border: none;
      background: $neutral-100;
      border-radius: $radius-md;
      cursor: pointer;

      &:hover {
        background: $primary-100;
      }
    }

    span {
      font-weight: 600;
    }
  }

  &__months {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: $spacing-2;
  }

  &__month {
    padding: $spacing-2;
    text-align: center;
    border: 1px solid transparent;
    border-radius: $radius-md;
    background: none;
    cursor: pointer;
    text-transform: capitalize;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      background: $primary-50;
    }

    &--selected {
      background: $primary-500;
      color: white;

      &:hover {
        background: $primary-600 !important;
      }
    }

    &--disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>
