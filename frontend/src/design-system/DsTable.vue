<template>
  <div class="ds-table-wrapper">
    <table :class="['ds-table', { 'ds-table--striped': striped, 'ds-table--hoverable': hoverable }]">
      <thead>
        <tr>
          <th v-if="selectable" class="ds-table__checkbox-col">
            <input
              type="checkbox"
              :checked="allSelected"
              :indeterminate="someSelected"
              @change="toggleAll"
            />
          </th>
          <th
            v-for="col in columns"
            :key="col.key"
            :class="{ 'ds-table__sortable': col.sortable }"
            :style="{ width: col.width }"
            @click="col.sortable && handleSort(col.key)"
          >
            <span class="ds-table__header-content">
              {{ col.label }}
              <span v-if="col.sortable && sortKey === col.key" class="ds-table__sort-icon">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </span>
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="loading">
          <td :colspan="totalCols" class="ds-table__loading">
            Carregando...
          </td>
        </tr>

        <tr v-else-if="!data.length">
          <td :colspan="totalCols" class="ds-table__empty">
            <slot name="empty">
              <DsEmptyState
                title="Nenhum dado encontrado"
                description="Não há registros para exibir."
              />
            </slot>
          </td>
        </tr>

        <tr
          v-for="(row, idx) in paginatedData"
          v-else
          :key="getRowKey(row, idx)"
          :class="{ 'ds-table__row-selected': isSelected(row) }"
        >
          <td v-if="selectable" class="ds-table__checkbox-col">
            <input
              type="checkbox"
              :checked="isSelected(row)"
              @change="toggleRow(row)"
            />
          </td>
          <td v-for="col in columns" :key="col.key">
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
              {{ row[col.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Pagination -->
    <div v-if="paginated && !loading && data.length" class="ds-table__pagination">
      <span class="ds-table__pagination-info">
        Exibindo {{ startIndex + 1 }}-{{ endIndex }} de {{ data.length }}
      </span>
      <div class="ds-table__pagination-controls">
        <button :disabled="currentPage === 1" @click="currentPage--">←</button>
        <span>{{ currentPage }} / {{ totalPages }}</span>
        <button :disabled="currentPage === totalPages" @click="currentPage++">→</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import DsEmptyState from './DsEmptyState.vue';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

interface Props {
  columns: Column[];
  data: Record<string, unknown>[];
  rowKey?: string;
  selectable?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  rowKey: 'id',
  selectable: false,
  striped: false,
  hoverable: true,
  paginated: false,
  pageSize: 10,
  loading: false,
});

const emit = defineEmits<{
  sort: [key: string, order: 'asc' | 'desc'];
  selectionChange: [selected: Record<string, unknown>[]];
}>();

const sortKey = ref<string | null>(null);
const sortOrder = ref<'asc' | 'desc'>('asc');
const currentPage = ref(1);
const selected = ref<Set<unknown>>(new Set());

const totalCols = computed(() => props.columns.length + (props.selectable ? 1 : 0));

const totalPages = computed(() => Math.ceil(props.data.length / props.pageSize));
const startIndex = computed(() => (currentPage.value - 1) * props.pageSize);
const endIndex = computed(() => Math.min(startIndex.value + props.pageSize, props.data.length));

const paginatedData = computed(() => {
  if (!props.paginated) return props.data;
  return props.data.slice(startIndex.value, endIndex.value);
});

const allSelected = computed(() => {
  return props.data.length > 0 && selected.value.size === props.data.length;
});

const someSelected = computed(() => {
  return selected.value.size > 0 && selected.value.size < props.data.length;
});

function getRowKey(row: Record<string, unknown>, idx: number): string | number {
  const key = row[props.rowKey];
  if (typeof key === 'string' || typeof key === 'number') {
    return key;
  }
  return idx;
}

function handleSort(key: string) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
  emit('sort', key, sortOrder.value);
}

function isSelected(row: Record<string, unknown>): boolean {
  return selected.value.has(row[props.rowKey]);
}

function toggleRow(row: Record<string, unknown>) {
  const key = row[props.rowKey];
  if (selected.value.has(key)) {
    selected.value.delete(key);
  } else {
    selected.value.add(key);
  }
  emitSelection();
}

function toggleAll() {
  if (allSelected.value) {
    selected.value.clear();
  } else {
    props.data.forEach(row => selected.value.add(row[props.rowKey]));
  }
  emitSelection();
}

function emitSelection() {
  const selectedRows = props.data.filter(row => selected.value.has(row[props.rowKey]));
  emit('selectionChange', selectedRows);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.ds-table-wrapper {
  background: $bg-primary;
  border-radius: $radius-lg;
  overflow: hidden;
  border: 1px solid $border-light;
}

.ds-table {
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: $spacing-3 $spacing-4;
    text-align: left;
  }

  thead {
    background: $bg-secondary;
    border-bottom: 2px solid $border-default;

    th {
      font-weight: 600;
      color: $text-secondary;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid $border-light;

      &:last-child {
        border-bottom: none;
      }
    }

    td {
      color: $text-primary;
      font-size: 0.9375rem;
    }
  }

  &--striped tbody tr:nth-child(even) {
    background: $bg-secondary;
  }

  &--hoverable tbody tr:hover {
    background: $primary-50;
  }

  &__checkbox-col {
    width: 40px;
    text-align: center !important;
  }

  &__sortable {
    cursor: pointer;
    user-select: none;

    &:hover {
      color: $primary-600;
    }
  }

  &__header-content {
    display: flex;
    align-items: center;
    gap: $spacing-1;
  }

  &__sort-icon {
    font-size: 0.75rem;
  }

  &__row-selected {
    background: $primary-50 !important;
  }

  &__loading,
  &__empty {
    text-align: center;
    padding: $spacing-8 !important;
    color: $text-tertiary;
  }

  &__pagination {
    @include flex-between;
    padding: $spacing-3 $spacing-4;
    border-top: 1px solid $border-light;
    background: $bg-secondary;
  }

  &__pagination-info {
    font-size: 0.875rem;
    color: $text-secondary;
  }

  &__pagination-controls {
    display: flex;
    align-items: center;
    gap: $spacing-2;

    button {
      @include flex-center;
      width: 32px;
      height: 32px;
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

    span {
      font-size: 0.875rem;
      color: $text-secondary;
    }
  }
}
</style>
