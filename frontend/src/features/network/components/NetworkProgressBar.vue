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
  requiredActives: number;
  requiredTeam: number;
}

const TITLE_CONFIG: Record<TitleKey, TitleRequirement> = {
  none:    { label: 'Sem Título', color: '#9e9e9e', bg: '#f5f5f5',  requiredActives: 2,  requiredTeam: 2  },
  bronze:  { label: 'Bronze',     color: '#7a4a10', bg: '#fbe9c5',  requiredActives: 5,  requiredTeam: 10 },
  silver:  { label: 'Prata',      color: '#555',    bg: '#ebebeb',  requiredActives: 8,  requiredTeam: 25 },
  gold:    { label: 'Ouro',       color: '#7a5800', bg: '#fff5c2',  requiredActives: 15, requiredTeam: 50 },
  diamond: { label: 'Diamante',   color: '#007fa3', bg: '#d9f5fb',  requiredActives: 0,  requiredTeam: 0  },
};

const TITLE_ORDER: TitleKey[] = ['none', 'bronze', 'silver', 'gold', 'diamond'];

interface Props {
  currentTitle: TitleKey;
  activeMembers: number;
  teamCount: number;
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
  const activeProgress = req.requiredActives > 0 ? props.activeMembers / req.requiredActives : 1;
  const teamProgress = req.requiredTeam > 0 ? props.teamCount / req.requiredTeam : 1;
  return Math.min(Math.round(((activeProgress + teamProgress) / 2) * 100), 99);
});

const missingActives = computed(() =>
  Math.max(0, nextConfig.value.requiredActives - props.activeMembers),
);
const missingTeam = computed(() =>
  Math.max(0, nextConfig.value.requiredTeam - props.teamCount),
);

const message = computed(() => {
  if (isDiamond.value) return 'Parabéns! Você atingiu o título máximo.';
  const parts: string[] = [];
  if (missingActives.value > 0)
    parts.push(`${missingActives.value} membro${missingActives.value > 1 ? 's' : ''} ativo${missingActives.value > 1 ? 's' : ''}`);
  if (missingTeam.value > 0)
    parts.push(`${missingTeam.value} na rede`);
  if (parts.length === 0) return `Quase lá! Mantenha o ritmo para virar ${nextConfig.value.label}.`;
  return `Faltam ${parts.join(' e ')} para virar ${nextConfig.value.label}.`;
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
