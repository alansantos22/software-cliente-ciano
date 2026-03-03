<template>
  <div class="career-timeline">
    <div class="career-timeline__track" :style="`--total: ${tiers.length}`">
      <div
        v-for="(tier, idx) in tiers"
        :key="tier.name"
        class="tier-node"
        :class="{
          'tier-node--active': activeTierIndex === idx,
          'tier-node--unlocked': idx <= activeTierIndex,
        }"
        :style="{ '--color': tier.color }"
      >
        <!-- Connector line (except last) -->
        <div v-if="idx < tiers.length - 1" class="tier-node__connector" />

        <!-- Icon bubble -->
        <div class="tier-node__bubble" @mouseenter="activeTierIndex = idx">
          <span class="tier-node__icon"><font-awesome-icon :icon="tier.icon" :style="{ color: tier.color }" /></span>
        </div>

        <!-- Label -->
        <div class="tier-node__label">
          <span class="tier-node__name" :style="{ color: tier.color }">{{ tier.name }}</span>
          <span class="tier-node__req">{{ tier.miniReq }}</span>
        </div>

        <!-- Tooltip card -->
        <Transition name="tier-popup">
          <div v-if="activeTierIndex === idx" class="tier-node__card">
            <div class="tier-node__card-header">
              <span class="tier-node__card-icon"><font-awesome-icon :icon="tier.icon" :style="{ color: tier.color }" /></span>
              <div>
                <strong :style="{ color: tier.color }">{{ tier.name }}</strong>
                <p class="tier-node__card-req">{{ tier.requirement }}</p>
              </div>
            </div>
            <ul class="tier-node__card-benefits">
              <li v-for="b in tier.benefits" :key="b">
                <span class="tier-check"><font-awesome-icon icon="check" /></span> {{ b }}
              </li>
            </ul>
            <div v-if="tier.perk" class="tier-node__perk">
              <font-awesome-icon icon="plane" /> {{ tier.perk }}
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Mobile: vertical list fallback -->
    <div class="career-timeline__mobile">
      <div
        v-for="(tier, idx) in tiers"
        :key="tier.name + '_m'"
        class="tier-mobile"
        :style="{ '--color': tier.color }"
      >
        <div class="tier-mobile__left">
          <div class="tier-mobile__bubble">
            <span><font-awesome-icon :icon="tier.icon" :style="{ color: tier.color }" /></span>
          </div>
          <div v-if="idx < tiers.length - 1" class="tier-mobile__line" />
        </div>
        <div class="tier-mobile__content">
          <h4 :style="{ color: tier.color }">{{ tier.name }}</h4>
          <p class="tier-mobile__req">{{ tier.requirement }}</p>
          <ul>
            <li v-for="b in tier.benefits" :key="b"><font-awesome-icon icon="check" /> {{ b }}</li>
          </ul>
          <div v-if="tier.perk" class="tier-mobile__perk"><font-awesome-icon icon="plane" /> {{ tier.perk }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const activeTierIndex = ref(0);

const tiers = [
  {
    name: 'Bronze',
    icon: 'medal',
    color: '#CD7F32',
    miniReq: '2 ativos',
    requirement: '2 pessoas ativas na sua rede',
    benefits: [
      'Bônus recompra: 1 nível (5% L1)',
      'Bônus equipe: 2 níveis (2% do total)',
      'Comissão primeira compra 10%',
    ],
    perk: null,
  },
  {
    name: 'Prata',
    icon: 'shield-halved',
    color: '#9BA3AF',
    miniReq: '1 Bronze',
    requirement: 'Ajudar 1 indicado a virar Bronze',
    benefits: [
      'Bônus recompra: 2 níveis (5% L1, 2% L2)',
      'Bônus equipe: 3 níveis (2% do total)',
      'Comissão primeira compra 10%',
    ],
    perk: null,
  },
  {
    name: 'Ouro',
    icon: 'trophy',
    color: '#D97706',
    miniReq: '2 Bronzes',
    requirement: '2 Bronzes em linhas diferentes',
    benefits: [
      'Bônus recompra: 4 níveis (5% L1, 2% L2-L4)',
      'Bônus equipe: 4 níveis (2% do total)',
      'Bônus liderança: 1% sobre 5 níveis qualificados',
      'Comissão primeira compra 10%',
    ],
    perk: null,
  },
  {
    name: 'Diamante',
    icon: 'gem',
    color: '#38BDF8',
    miniReq: '3 Bronzes',
    requirement: '3 Bronzes em linhas diferentes',
    benefits: [
      'Bônus recompra: 6 níveis (5% L1, 2% L2-L6)',
      'Bônus equipe: 5 níveis (2% do total)',
      'Bônus liderança: 2% sobre 5 níveis qualificados',
      'Comissão primeira compra 10%',
    ],
    perk: 'Máximo de profundidade desbloqueado',
  },
];
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

// ─── Desktop Track ─────────────────────────────────────────
.career-timeline {
  padding: $spacing-4 0 $spacing-10;

  &__track {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: 0;
    position: relative;

    @media (max-width: 700px) {
      display: none;
    }
  }

  &__mobile {
    display: none;

    @media (max-width: 700px) {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
  }
}

// ─── Tier Node (Desktop) ──────────────────────────────────
.tier-node {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-3;
  flex: 1;
  max-width: 200px;
  cursor: pointer;

  &__connector {
    position: absolute;
    top: 32px; /* half of bubble */
    left: calc(50% + 32px);
    right: calc(-50% + 32px);
    height: 3px;
    background: $border-light;
    z-index: 0;
    transition: background 0.3s;
  }

  &--unlocked .tier-node__connector {
    background: linear-gradient(90deg, var(--color), $border-light);
  }

  &__bubble {
    position: relative;
    z-index: 1;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color) 12%, $bg-primary);
    border: 3px solid color-mix(in srgb, var(--color) 40%, $border-light);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.75rem;
    transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s, background 0.25s;

    .tier-node:hover &,
    .tier-node--active & {
      border-color: var(--color);
      background: color-mix(in srgb, var(--color) 22%, $bg-primary);
      transform: scale(1.15);
      box-shadow: 0 0 0 6px color-mix(in srgb, var(--color) 15%, transparent);
    }
  }

  &__label {
    text-align: center;
  }

  &__name {
    display: block;
    font-weight: 700;
    font-size: 1rem;
  }

  &__req {
    display: block;
    font-size: 0.75rem;
    color: $text-tertiary;
  }

  // ─── Tooltip popup card ──────────────────────────────
  &__card {
    position: absolute;
    top: calc(100% + $spacing-4);
    left: 50%;
    transform: translateX(-50%);
    width: 240px;
    background: $bg-primary;
    border: 1px solid $border-light;
    border-top: 3px solid var(--color);
    border-radius: 14px;
    padding: $spacing-4;
    box-shadow: 0 16px 40px rgba(0,0,0,0.12);
    z-index: 10;

    &-header {
      display: flex;
      align-items: flex-start;
      gap: $spacing-3;
      margin-bottom: $spacing-3;

      span { font-size: 1.5rem; }

      strong {
        font-size: 1rem;
        display: block;
      }
    }

    &-req {
      font-size: 0.75rem;
      color: $text-secondary;
      margin: 2px 0 0;
    }

    &-benefits {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;

      li {
        font-size: 0.8125rem;
        color: $text-secondary;
        display: flex;
        align-items: flex-start;
        gap: 6px;
      }
    }
  }

  &__perk {
    margin-top: $spacing-3;
    padding: $spacing-2 $spacing-3;
    background: linear-gradient(135deg, rgba($accent-500,0.1), rgba($primary-500,0.07));
    border-radius: 8px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: $accent-700;
    text-align: center;
  }
}

.tier-check {
  color: $success;
  font-size: 0.75rem;
  flex-shrink: 0;
}

// ─── Popup transition ─────────────────────────────────────
.tier-popup-enter-active,
.tier-popup-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.tier-popup-enter-from,
.tier-popup-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}

// ─── Mobile tier list ──────────────────────────────────────
.tier-mobile {
  display: flex;
  gap: $spacing-4;

  &__left {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }

  &__bubble {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 3px solid var(--color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    background: color-mix(in srgb, var(--color) 14%, $bg-primary);
    flex-shrink: 0;
  }

  &__line {
    width: 3px;
    flex: 1;
    min-height: 24px;
    background: $border-light;
    margin: 4px 0;
  }

  &__content {
    padding-bottom: $spacing-5;

    h4 {
      font-size: 1rem;
      font-weight: 700;
      margin: 0 0 2px;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: $spacing-2 0 0;
      font-size: 0.8125rem;
      color: $text-secondary;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
  }

  &__req {
    font-size: 0.8125rem;
    color: $text-secondary;
    margin: 0;
  }

  &__perk {
    margin-top: $spacing-2;
    font-size: 0.8125rem;
    font-weight: 600;
    color: $accent-700;
  }
}
</style>
