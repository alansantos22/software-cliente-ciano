<template>
  <div class="user-row-wrapper" :style="{ '--depth': depth }">
    <!-- Connector lines for tree -->
    <div v-if="depth > 0" class="user-row-wrapper__connector" />

    <!-- Row card -->
    <div
      :class="[
        'user-row',
        `user-row--${rowStatus}`,
        { 'user-row--expanded': isExpanded },
        { 'user-row--has-children': node.children.length > 0 },
      ]"
    >
      <!-- Expand/Collapse toggle -->
      <button
        v-if="node.children.length > 0"
        class="user-row__toggle"
        :title="isExpanded ? 'Recolher' : 'Expandir'"
        @click.stop="isExpanded = !isExpanded"
      >
        <font-awesome-icon :icon="isExpanded ? 'chevron-down' : 'chevron-right'" class="user-row__chevron" />
      </button>
      <div v-else class="user-row__toggle-spacer" />

      <!-- Avatar with status border -->
      <div :class="['user-row__avatar', `user-row__avatar--${rowStatus}`]">
        {{ initials }}
        <span class="user-row__status-dot" />
      </div>

      <!-- Main info -->
      <div class="user-row__info">
        <div class="user-row__name-line">
          <span class="user-row__name">{{ node.name }}</span>
          <span class="user-row__title-badge" :style="titleStyle">
            {{ titleLabel }}
          </span>
          <span class="user-row__partner-badge">{{ partnerLabel }}</span>
        </div>
        <div class="user-row__meta">
          <span class="user-row__email">{{ node.email }}</span>
        </div>
      </div>

      <!-- Stats -->
      <div class="user-row__stats">
        <!-- Quotas -->
        <div class="user-row__stat">
          <span class="user-row__stat-value">{{ node.quotaCount }}</span>
          <span class="user-row__stat-label">cotas</span>
        </div>

        <!-- Team depth -->
        <div class="user-row__stat user-row__stat--team">
          <div class="user-row__team-bar">
            <div
              class="user-row__team-fill"
              :style="{ width: `${teamBarWidth}%` }"
            />
          </div>
          <span class="user-row__stat-label">
            {{ node.teamCount }} na equipe
          </span>
        </div>

        <!-- Status / Expiry -->
        <div :class="['user-row__status', `user-row__status--${rowStatus}`]">
          <font-awesome-icon :icon="statusIcon" />
          {{ statusText }}
        </div>
      </div>

      <!-- Actions -->
      <div class="user-row__actions">
        <a
          v-if="node.phone"
          :href="`https://wa.me/55${sanitizedPhone}`"
          target="_blank"
          rel="noopener"
          class="user-row__whatsapp"
          :title="`Chamar ${node.name} (${node.phone})`"
        >
          <font-awesome-icon icon="phone" />
        </a>
      </div>
    </div>

    <!-- Recursive children -->
    <div v-if="node.children.length > 0 && isExpanded" class="user-row-wrapper__children">
      <NetworkUserRow
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { NetworkNode } from '@/mocks';

defineOptions({ name: 'NetworkUserRow' });

interface Props {
  node: NetworkNode;
  depth?: number;
}

const props = withDefaults(defineProps<Props>(), { depth: 0 });

const isExpanded = ref(true);

// ── Status ──────────────────────────────────────────────────────────────────
const TODAY = new Date('2026-02-18');

const daysUntilExpiry = computed(() => {
  const exp = new Date(props.node.expiresAt);
  const diff = exp.getTime() - TODAY.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

const rowStatus = computed<'active' | 'expiring' | 'inactive'>(() => {
  if (!props.node.isActive) return 'inactive';
  if (daysUntilExpiry.value <= 15) return 'expiring';
  return 'active';
});

const statusText = computed(() => {
  if (!props.node.isActive) return 'Inativo';
  if (daysUntilExpiry.value <= 0) return 'Expirado';
  if (daysUntilExpiry.value <= 15) return `Expira em ${daysUntilExpiry.value}d`;
  return 'Ativo';
});

const statusIcon = computed(() => {
  if (rowStatus.value === 'inactive') return 'circle-xmark';
  if (rowStatus.value === 'expiring') return 'clock';
  return 'circle-check';
});

// ── Avatar / initials ────────────────────────────────────────────────────────
const initials = computed(() =>
  props.node.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase(),
);

// ── Title badge ──────────────────────────────────────────────────────────────
const TITLE_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  none:    { color: '#757575', bg: '#f5f5f5',  label: 'Sem Título' },
  bronze:  { color: '#7a4a10', bg: '#fbe9c5',  label: 'Bronze'     },
  silver:  { color: '#4a4a4a', bg: '#ebebeb',  label: 'Prata'      },
  gold:    { color: '#7a5800', bg: '#fff5c2',  label: 'Ouro'       },
  diamond: { color: '#007fa3', bg: '#d9f5fb',  label: 'Diamante'   },
};

const FALLBACK_TITLE = { color: '#757575', bg: '#f5f5f5', label: 'Sem Título' };

const titleConfig = computed(
  () => TITLE_STYLES[props.node.title] ?? FALLBACK_TITLE,
);

const titleStyle = computed(() => ({
  color: titleConfig.value.color,
  background: titleConfig.value.bg,
}));

const titleLabel = computed(() => titleConfig.value.label);

// ── Partner level ────────────────────────────────────────────────────────────
const PARTNER_LABELS: Record<string, string> = {
  socio: 'Sócio', platinum: 'Platina', vip: 'VIP', imperial: 'Imperial',
};
const partnerLabel = computed(
  () => PARTNER_LABELS[props.node.partnerLevel] ?? props.node.partnerLevel,
);

// ── Team bar ─────────────────────────────────────────────────────────────────
const teamBarWidth = computed(() => Math.min(Math.round((props.node.teamCount / 50) * 100), 100));

// ── WhatsApp phone sanitize ───────────────────────────────────────────────────
const sanitizedPhone = computed(() =>
  (props.node.phone ?? '').replace(/\D/g, ''),
);
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

// ── Wrapper ──────────────────────────────────────────────────────────────────
.user-row-wrapper {
  position: relative;

  &__connector {
    position: absolute;
    top: 0;
    left: calc(var(--depth, 0) * 20px - 12px);
    width: 2px;
    height: 100%;
    background: $neutral-200;
    pointer-events: none;
  }

  &__children {
    margin-left: 20px;
    border-left: 2px solid $neutral-200;
    padding-left: 0;
  }
}

// ── Row ──────────────────────────────────────────────────────────────────────
.user-row {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-3 $spacing-4;
  border-radius: $radius-md;
  margin-bottom: $spacing-1;
  background: $bg-primary;
  border: 1.5px solid $border-light;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;

  &:hover {
    box-shadow: $shadow-md;
    border-color: $border-default;

    .user-row__actions {
      opacity: 1;
    }
  }

  // Status variants
  &--inactive {
    background: $neutral-50;
    opacity: 0.75;

    .user-row__avatar {
      filter: grayscale(0.5);
    }
  }

  &--expiring {
    border-left: 3px solid $warning;
    background: $accent-50;
  }

  // ── Toggle ────────────────────────────────────────────────────────────────
  &__toggle {
    width: 24px;
    height: 24px;
    border: none;
    background: $neutral-100;
    border-radius: $radius-sm;
    @include flex-center;
    cursor: pointer;
    color: $text-secondary;
    flex-shrink: 0;
    font-size: 0.6875rem;
    transition: background 0.15s;

    &:hover {
      background: $primary-100;
      color: $primary-700;
    }
  }

  &__toggle-spacer {
    width: 24px;
    flex-shrink: 0;
  }

  // ── Avatar ────────────────────────────────────────────────────────────────
  &__avatar {
    position: relative;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, $primary-400, $secondary-400);
    color: white;
    @include flex-center;
    font-weight: 700;
    font-size: 0.875rem;
    flex-shrink: 0;
    border: 3px solid transparent;

    &--active  { border-color: $success; }
    &--expiring { border-color: $warning; }
    &--inactive { border-color: $neutral-400; background: linear-gradient(135deg, $neutral-400, $neutral-500); }
  }

  &__status-dot {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid white;

    .user-row__avatar--active   & { background: $success; }
    .user-row__avatar--expiring & { background: $warning; }
    .user-row__avatar--inactive & { background: $neutral-400; }
  }

  // ── Info ──────────────────────────────────────────────────────────────────
  &__info {
    flex: 1;
    min-width: 0;
    @include flex-column;
    gap: 2px;
  }

  &__name-line {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: $spacing-2;
  }

  &__name {
    font-weight: 600;
    color: $text-primary;
    font-size: 0.9375rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__title-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px $spacing-2;
    border-radius: $radius-full;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }

  &__partner-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px $spacing-2;
    border-radius: $radius-full;
    font-size: 0.6875rem;
    font-weight: 500;
    background: $primary-50;
    color: $primary-700;
    border: 1px solid $primary-200;
    flex-shrink: 0;
  }

  &__meta {
    display: flex;
    gap: $spacing-3;
    font-size: 0.75rem;
    color: $text-tertiary;
    flex-wrap: wrap;
  }

  &__email {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 220px;

    @media (max-width: 768px) {
      display: none;
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  &__stats {
    display: flex;
    align-items: center;
    gap: $spacing-5;
    flex-shrink: 0;

    @media (max-width: 900px) {
      gap: $spacing-3;
    }

    @media (max-width: 640px) {
      display: none;
    }
  }

  &__stat {
    @include flex-column;
    align-items: center;
    gap: 2px;

    &-value {
      font-size: 1rem;
      font-weight: 700;
      color: $primary-700;
    }

    &-label {
      font-size: 0.6875rem;
      color: $text-tertiary;
      white-space: nowrap;
    }

    &--team {
      min-width: 80px;
    }
  }

  &__team-bar {
    width: 80px;
    height: 5px;
    background: $neutral-200;
    border-radius: $radius-full;
    overflow: hidden;
    margin-bottom: 2px;
  }

  &__team-fill {
    height: 100%;
    background: linear-gradient(90deg, $primary-400, $secondary-400);
    border-radius: $radius-full;
    transition: width 0.6s ease;
  }

  // ── Status badge ──────────────────────────────────────────────────────────
  &__status {
    display: inline-flex;
    align-items: center;
    gap: $spacing-1;
    padding: $spacing-1 $spacing-3;
    border-radius: $radius-full;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;

    &--active   { background: $secondary-50;  color: $success-dark;  }
    &--expiring { background: $accent-100;    color: $warning-dark;  }
    &--inactive { background: $neutral-200;   color: $text-tertiary; }
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  &__actions {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    flex-shrink: 0;
    opacity: 0.4;
    transition: opacity 0.15s;

    @media (max-width: 640px) {
      opacity: 1;
    }
  }

  &__whatsapp {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #25d366;
    color: white;
    @include flex-center;
    font-size: 1rem;
    text-decoration: none;
    transition: transform 0.15s ease, box-shadow 0.15s ease;

    &:hover {
      transform: scale(1.1);
      box-shadow: 0 2px 8px rgba(37, 211, 102, 0.5);
    }
  }
}
</style>
