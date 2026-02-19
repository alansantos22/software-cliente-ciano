<template>
  <div class="progress-bar">
    <div class="progress-bar__header">
      <div class="progress-bar__titles">
        <span class="progress-bar__badge" :style="currentStyle">
          {{ titleLabel(currentTitle) }}
        </span>
        <font-awesome-icon icon="arrow-right" class="progress-bar__arrow" />
        <span class="progress-bar__badge progress-bar__badge--next" :style="nextStyle">
          {{ titleLabel(nextTitle) }}
        </span>
      </div>
      <span class="progress-bar__percent">{{ percent }}%</span>
    </div>

    <div class="progress-bar__track">
      <div
        class="progress-bar__fill"
        :style="{ width: `${percent}%`, background: fillGradient }"
      />
    </div>

    <p class="progress-bar__message">
      <font-awesome-icon icon="bolt" />
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type TitleKey = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';

interface TitleRequirement {
  label: string;
  color: string;
  bg: string;
  /** Number of active people in network (for Bronze) */
  requiredActives: number;
  /** Number of qualified Bronzes needed (for Prata/Ouro/Diamante) */
  requiredBronzes: number;
  /** Number of different lines the Bronzes must be in (0 = N/A) */
  requiredLines: number;
  /** Human-readable requirement description */
  requirementText: string;
}

const TITLE_CONFIG: Record<TitleKey, TitleRequirement> = {
  none:    { label: 'Sem Título', color: '#9e9e9e', bg: '#f5f5f5', requiredActives: 2,  requiredBronzes: 0, requiredLines: 0, requirementText: '2 pessoas ativas na rede' },
  bronze:  { label: 'Bronze',     color: '#7a4a10', bg: '#fbe9c5', requiredActives: 0,  requiredBronzes: 1, requiredLines: 0, requirementText: 'Ajudar 1 indicado a virar Bronze' },
  silver:  { label: 'Prata',      color: '#555',    bg: '#ebebeb', requiredActives: 0,  requiredBronzes: 2, requiredLines: 2, requirementText: '2 Bronzes em linhas diferentes' },
  gold:    { label: 'Ouro',       color: '#7a5800', bg: '#fff5c2', requiredActives: 0,  requiredBronzes: 3, requiredLines: 3, requirementText: '3 Bronzes em linhas diferentes' },
  diamond: { label: 'Diamante',   color: '#007fa3', bg: '#d9f5fb', requiredActives: 0,  requiredBronzes: 0, requiredLines: 0, requirementText: 'Título máximo alcançado' },
};

const TITLE_ORDER: TitleKey[] = ['none', 'bronze', 'silver', 'gold', 'diamond'];

interface Props {
  currentTitle: TitleKey;
  activeMembers: number;
  /** Number of Bronzes qualified in the user's network */
  qualifiedBronzes: number;
  /** Number of distinct lines with qualified Bronzes */
  qualifiedLines: number;
}

const props = defineProps<Props>();

const currentTitle = computed(() => props.currentTitle);

const nextTitle = computed<TitleKey>(() => {
  const idx = TITLE_ORDER.indexOf(currentTitle.value);
  return TITLE_ORDER[Math.min(idx + 1, TITLE_ORDER.length - 1)] as TitleKey;
});

const isDiamond = computed(() => currentTitle.value === 'diamond');

const nextConfig = computed(() => TITLE_CONFIG[nextTitle.value]);
const currentConfig = computed(() => TITLE_CONFIG[currentTitle.value]);

const percent = computed(() => {
  if (isDiamond.value) return 100;
  const req = nextConfig.value;

  // Bronze requirement: active members
  if (req.requiredActives > 0) {
    return Math.min(Math.round((props.activeMembers / req.requiredActives) * 100), 99);
  }

  // Prata/Ouro/Diamante: qualified Bronzes in distinct lines
  if (req.requiredBronzes > 0) {
    const bronzeProgress = props.qualifiedBronzes / req.requiredBronzes;
    const lineProgress = req.requiredLines > 0 ? props.qualifiedLines / req.requiredLines : 1;
    return Math.min(Math.round(((bronzeProgress + lineProgress) / 2) * 100), 99);
  }

  return 99;
});

const message = computed(() => {
  if (isDiamond.value) return 'Parabéns! Você atingiu o título máximo — Diamante.';
  const req = nextConfig.value;

  // Bronze: need active members
  if (req.requiredActives > 0) {
    const missing = Math.max(0, req.requiredActives - props.activeMembers);
    if (missing === 0) return `Quase lá! Mantenha o ritmo para virar ${req.label}.`;
    return `Faltam ${missing} pessoa${missing > 1 ? 's' : ''} ativa${missing > 1 ? 's' : ''} para virar ${req.label}.`;
  }

  // Prata/Ouro/Diamante: need Bronzes in different lines
  if (req.requiredBronzes > 0) {
    const missingBronzes = Math.max(0, req.requiredBronzes - props.qualifiedBronzes);
    const missingLines = Math.max(0, req.requiredLines - props.qualifiedLines);
    if (missingBronzes === 0 && missingLines === 0) return `Quase lá! Mantenha o ritmo para virar ${req.label}.`;
    const parts: string[] = [];
    if (missingBronzes > 0) parts.push(`${missingBronzes} Bronze${missingBronzes > 1 ? 's' : ''}`);
    if (missingLines > 0) parts.push(`${missingLines} linha${missingLines > 1 ? 's' : ''} diferente${missingLines > 1 ? 's' : ''}`);
    return `Faltam ${parts.join(' em ')} para virar ${req.label}.`;
  }

  return `Continue crescendo sua rede para avançar!`;
});

const fillGradient = computed(
  () => `linear-gradient(90deg, ${currentConfig.value.color}, ${nextConfig.value.color})`,
);

const currentStyle = computed(() => ({
  color: currentConfig.value.color,
  background: currentConfig.value.bg,
}));

const nextStyle = computed(() => ({
  color: nextConfig.value.color,
  background: nextConfig.value.bg,
}));

function titleLabel(key: TitleKey) {
  return TITLE_CONFIG[key].label;
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.progress-bar {
  background: $bg-primary;
  border-radius: $radius-lg;
  padding: $spacing-5 $spacing-6;
  box-shadow: $shadow-md;

  &__header {
    @include flex-between;
    margin-bottom: $spacing-3;
  }

  &__titles {
    display: flex;
    align-items: center;
    gap: $spacing-2;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: $spacing-1;
    padding: $spacing-1 $spacing-3;
    border-radius: $radius-full;
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.02em;

    &--next {
      font-style: italic;
    }
  }

  &__arrow {
    color: $text-tertiary;
    font-size: 0.75rem;
  }

  &__percent {
    font-size: 0.875rem;
    font-weight: 700;
    color: $text-secondary;
  }

  &__track {
    height: 10px;
    background: $neutral-200;
    border-radius: $radius-full;
    overflow: hidden;
    margin-bottom: $spacing-3;
  }

  &__fill {
    height: 100%;
    border-radius: $radius-full;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &__message {
    font-size: 0.8125rem;
    color: $text-secondary;
    margin: 0;
    display: flex;
    align-items: center;
    gap: $spacing-2;

    svg {
      color: $accent-500;
      flex-shrink: 0;
    }
  }
}
</style>
