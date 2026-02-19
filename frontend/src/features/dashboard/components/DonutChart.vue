<template>
  <div class="donut-chart">
    <!-- SVG Donut -->
    <div class="donut-chart__svg-wrapper">
      <svg viewBox="0 0 120 120" class="donut-chart__svg">
        <!-- Background ring -->
        <circle
          cx="60" cy="60" r="50"
          fill="none"
          stroke="#f0f0f0"
          stroke-width="18"
        />

        <!-- Segments -->
        <circle
          v-for="(seg, i) in segments"
          :key="i"
          cx="60" cy="60" r="50"
          fill="none"
          :stroke="seg.color"
          stroke-width="18"
          stroke-linecap="round"
          :stroke-dasharray="`${seg.dash} ${CIRCUMFERENCE}`"
          :stroke-dashoffset="`${-seg.offset}`"
          class="donut-chart__segment"
          :style="{ transitionDelay: `${i * 80}ms` }"
        />

        <!-- Center label -->
        <text x="60" y="55" text-anchor="middle" class="donut-chart__center-label">
          Total
        </text>
        <text x="60" y="70" text-anchor="middle" class="donut-chart__center-value">
          {{ totalFormatted }}
        </text>
      </svg>
    </div>

    <!-- Legend -->
    <ul class="donut-chart__legend">
      <li
        v-for="(item, i) in validData"
        :key="i"
        class="donut-chart__legend-item"
        @mouseenter="hovered = i"
        @mouseleave="hovered = null"
        :class="{ 'donut-chart__legend-item--hovered': hovered === i }"
      >
        <span
          class="donut-chart__legend-dot"
          :style="{ background: item.color }"
        />
        <div class="donut-chart__legend-body">
          <span class="donut-chart__legend-label">{{ item.label }}</span>
          <span class="donut-chart__legend-value">{{ format(item.value) }}</span>
        </div>
        <span class="donut-chart__legend-pct">{{ pct(item.value) }}%</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

export interface DonutItem {
  label: string;
  value: number;
  color: string;
}

const props = defineProps<{
  data: DonutItem[];
}>();

const RADIUS       = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 314.16

const hovered = ref<number | null>(null);

const validData = computed(() => props.data.filter(d => d.value > 0));
const total = computed(() => validData.value.reduce((s, d) => s + d.value, 0));

const segments = computed(() => {
  let offset = 0;
  return validData.value.map(item => {
    const fraction = item.value / total.value;
    const dash = fraction * CIRCUMFERENCE;
    const seg = { ...item, dash, offset };
    offset += dash;
    return seg;
  });
});

const totalFormatted = computed(() => {
  if (total.value >= 1000)
    return `R$${(total.value / 1000).toFixed(1)}k`;
  return format(total.value);
});

function format(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function pct(value: number): string {
  if (total.value === 0) return '0';
  return ((value / total.value) * 100).toFixed(1).replace('.0', '');
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;

@keyframes draw-in {
  from { stroke-dasharray: 0 314.16; }
}

.donut-chart {
  display: flex;
  align-items: center;
  gap: $spacing-8;

  @media (max-width: 640px) {
    flex-direction: column;
    gap: $spacing-4;
  }

  &__svg-wrapper {
    flex-shrink: 0;
    width: 160px;
    height: 160px;

    @media (max-width: 640px) {
      width: 140px;
      height: 140px;
    }
  }

  &__svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  &__segment {
    transition: opacity 0.2s, stroke-width 0.2s;
    animation: draw-in 0.9s ease-out both;
  }

  &__center-label {
    transform: rotate(90deg);
    transform-origin: 60px 60px;
    font-size: 9px;
    fill: $text-tertiary;
    font-family: inherit;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  &__center-value {
    transform: rotate(90deg);
    transform-origin: 60px 60px;
    font-size: 11px;
    fill: $text-primary;
    font-weight: 700;
    font-family: inherit;
  }

  /* ── Legend ── */
  &__legend {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
    flex: 1;
  }

  &__legend-item {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-2 $spacing-3;
    border-radius: $radius-md;
    transition: background 0.15s;
    cursor: default;

    &--hovered,
    &:hover {
      background: $neutral-100;
    }
  }

  &__legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__legend-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  &__legend-label {
    font-size: 0.8125rem;
    color: $text-secondary;
  }

  &__legend-value {
    font-size: 0.9375rem;
    font-weight: 600;
    color: $text-primary;
  }

  &__legend-pct {
    font-size: 0.8125rem;
    font-weight: 700;
    color: $text-tertiary;
    min-width: 38px;
    text-align: right;
  }
}
</style>
