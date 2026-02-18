<template>
  <ul class="ds-tree-list" :class="{ 'ds-tree-list--root': isRoot }">
    <li
      v-for="(node, idx) in nodes"
      :key="getNodeKey(node, idx)"
      class="ds-tree-list__item"
    >
      <div
        class="ds-tree-list__node"
        :class="{ 'ds-tree-list__node--selected': isSelected(node) }"
        @click="handleClick(node)"
      >
        <button
          v-if="hasChildren(node)"
          class="ds-tree-list__toggle"
          type="button"
          @click.stop="toggleExpand(node)"
        >
          {{ isExpanded(node) ? '▼' : '▶' }}
        </button>
        <span v-else class="ds-tree-list__spacer" />

        <slot name="node" :node="node">
          <span class="ds-tree-list__label">{{ getNodeLabel(node) }}</span>
        </slot>
      </div>

      <Transition name="expand">
        <DsTreeList
          v-if="hasChildren(node) && isExpanded(node)"
          :nodes="getChildren(node)"
          :node-key="nodeKey"
          :label-key="labelKey"
          :children-key="childrenKey"
          :selected="selected"
          :expanded="expanded"
          :is-root="false"
          @select="emit('select', $event)"
          @toggle="emit('toggle', $event)"
        />
      </Transition>
    </li>
  </ul>
</template>

<script setup lang="ts">
interface TreeNode {
  [key: string]: unknown;
}

interface Props {
  nodes: TreeNode[];
  nodeKey?: string;
  labelKey?: string;
  childrenKey?: string;
  selected?: unknown;
  expanded?: Set<unknown>;
  isRoot?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  nodeKey: 'id',
  labelKey: 'label',
  childrenKey: 'children',
  isRoot: true,
});

const emit = defineEmits<{
  select: [node: TreeNode];
  toggle: [node: TreeNode];
}>();

function getNodeKey(node: TreeNode, idx: number): string | number {
  const key = node[props.nodeKey];
  if (typeof key === 'string' || typeof key === 'number') {
    return key;
  }
  return idx;
}

function getNodeLabel(node: TreeNode): string {
  const label = node[props.labelKey];
  return typeof label === 'string' ? label : String(label ?? '');
}

function getChildren(node: TreeNode): TreeNode[] {
  const children = node[props.childrenKey];
  return Array.isArray(children) ? children : [];
}

function hasChildren(node: TreeNode): boolean {
  return getChildren(node).length > 0;
}

function isSelected(node: TreeNode): boolean {
  return props.selected === node[props.nodeKey];
}

function isExpanded(node: TreeNode): boolean {
  return props.expanded?.has(node[props.nodeKey]) ?? false;
}

function handleClick(node: TreeNode) {
  emit('select', node);
}

function toggleExpand(node: TreeNode) {
  emit('toggle', node);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.ds-tree-list {
  list-style: none;
  padding: 0;
  margin: 0;

  &--root {
    padding: $spacing-2;
  }

  &:not(&--root) {
    padding-left: $spacing-6;
  }

  &__item {
    margin: $spacing-1 0;
  }

  &__node {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-2 $spacing-3;
    border-radius: $radius-md;
    cursor: pointer;
    transition: background $transition-fast;

    &:hover {
      background: $neutral-100;
    }

    &--selected {
      background: $primary-100;
      color: $primary-700;

      &:hover {
        background: $primary-200;
      }
    }
  }

  &__toggle {
    @include flex-center;
    width: 20px;
    height: 20px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.625rem;
    color: $text-tertiary;
    transition: color $transition-fast;

    &:hover {
      color: $primary-600;
    }
  }

  &__spacer {
    width: 20px;
  }

  &__label {
    flex: 1;
    font-size: 0.9375rem;
  }
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 500px;
}
</style>
