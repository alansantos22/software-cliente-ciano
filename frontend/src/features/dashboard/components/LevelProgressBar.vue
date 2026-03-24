<template>
  <div class="level-bar">
    <div class="level-bar__levels">
      <div class="level-bar__current">
        <span class="level-bar__badge" :class="`level-bar__badge--${currentLevel}`">
          <font-awesome-icon :icon="levelIcon(currentLevel)" />
        </span>
        <div>
          <span class="level-bar__current-label">Nível Atual</span>
          <span class="level-bar__current-name">{{ levelLabel(currentLevel) }}</span>
        </div>
      </div>
      <div class="level-bar__next">
        <div class="level-bar__next-info">
          <span>Próximo: <strong>{{ levelLabel(nextLevel) }}</strong></span>
          <span class="level-bar__unlock">+{{ bonusPercent }}% de bônus</span>
        </div>
        <span class="level-bar__badge level-bar__badge--locked" :class="`level-bar__badge--${nextLevel}`">
          <font-awesome-icon :icon="levelIcon(nextLevel)" />
        </span>
      </div>
    </div>

    <!-- XP bar -->
    <div class="level-bar__track">
      <div
        class="level-bar__fill"
        :class="`level-bar__fill--${currentLevel}`"
        :style="{ width: `${progressPercent}%` }"
      >
        <span class="level-bar__glow" />
      </div>
    </div>

    <p class="level-bar__caption">
      {{ captionText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type LevelKey = 'bronze' | 'prata' | 'ouro' | 'diamante';

const props = withDefaults(
  defineProps<{
    currentLevel: LevelKey;
    nextLevel: LevelKey;
    currentValue: number;  // progress toward next (e.g. qualified bronzes or actives)
    targetValue: number;   // required for next level
    bonusPercent?: number;
  }>(),
  {
    bonusPercent: 2,
  }
);

const LABELS: Record<LevelKey, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
  diamante: 'Diamante',
};

const REQUIREMENTS: Record<LevelKey, string> = {
  bronze: '2 pessoas ativas na rede',
  prata: '1 indicado Bronze',
  ouro: '2 Bronzes em linhas diferentes',
  diamante: '3 Bronzes em linhas diferentes',
};

const ICONS: Record<LevelKey, string> = {
  bronze: 'medal',
  prata: 'award',
  ouro: 'crown',
  diamante: 'gem',
};

function levelLabel(key: LevelKey | string) { return LABELS[key as LevelKey] ?? key ?? '—'; }
function levelIcon(key: LevelKey | string)  { return ICONS[key as LevelKey] ?? 'circle'; }

const progressPercent = computed(() => {
  const current = Number(props.currentValue) || 0;
  const target = Number(props.targetValue) || 1;
  if (target === 0 || isNaN(current) || isNaN(target)) return 0;
  return Math.min(100, Math.round((current / target) * 100));
});

const captionText = computed(() => {
  if (props.currentLevel === 'diamante') return 'Parabéns! Você atingiu o título máximo.';
  if (!props.nextLevel) return 'Continue crescendo sua rede para avançar!';
  const label = LABELS[props.nextLevel as LevelKey];
  const req = REQUIREMENTS[props.nextLevel as LevelKey];
  if (!label || !req) return 'Continue crescendo sua rede para avançar!';
  return `Requisito para ${label}: ${req}`;
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

@keyframes glow-pulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}

.level-bar {
  &__levels {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-3;
    gap: $spacing-4;
  }

  &__current,
  &__next {
    display: flex;
    align-items: center;
    gap: $spacing-2;
  }

  &__next {
    flex-direction: row-reverse;
    text-align: right;
    .level-bar__next-info {
      @include flex-column;
      gap: 2px;
    }
  }

  &__badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    font-size: 0.9rem;
    flex-shrink: 0;

    &--bronze  { background: linear-gradient(135deg, #cd7f32, #e5a55a); color: #fff; }
    &--prata   { background: linear-gradient(135deg, #94a3b8, #cbd5e1); color: #fff; }
    &--ouro    { background: linear-gradient(135deg, var(--accent-600), var(--accent-400)); color: #fff; }
    &--diamante{ background: linear-gradient(135deg, var(--primary-600), #7c3aed); color: #fff; }
    &--locked  { opacity: 0.45; filter: grayscale(0.4); }
  }

  &__current-label {
    display: block;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-tertiary);
  }

  &__current-name {
    display: block;
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  &__next-info span {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    strong { color: var(--text-primary); }
  }

  &__unlock {
    font-size: 0.75rem !important;
    font-weight: 600;
    color: var(--color-success) !important;
  }

  /* Bar */
  &__track {
    height: 10px;
    background: var(--neutral-200);
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: $spacing-2;
  }

  &__fill {
    position: relative;
    height: 100%;
    border-radius: 999px;
    transition: width 1s cubic-bezier(0.22, 1, 0.36, 1);

    &--bronze   { background: linear-gradient(90deg, #cd7f32, #e5a55a); }
    &--prata    { background: linear-gradient(90deg, #94a3b8, #cbd5e1); }
    &--ouro     { background: linear-gradient(90deg, var(--accent-700), var(--accent-400)); }
    &--diamante { background: linear-gradient(90deg, var(--primary-600), #7c3aed); }
  }

  &__glow {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: inherit;
    box-shadow: 0 0 8px 4px rgba(255,255,255,0.5);
    animation: glow-pulse 1.4s ease-in-out infinite;
  }

  &__caption {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    strong { color: var(--primary-700); font-weight: 600; }
  }
}
</style>
