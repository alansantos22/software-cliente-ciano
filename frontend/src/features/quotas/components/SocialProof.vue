<template>
  <div class="social-proof">
    <div class="social-proof__header">
      <span class="social-proof__eyebrow">Quem já é Sócio</span>
      <h2 class="social-proof__title">Eles já estão lucrando</h2>
      <p class="social-proof__subtitle">
        Histórias reais de sócios que decidiram investir no Grupo Ciano
      </p>
    </div>

    <div class="social-proof__grid">
      <div
        v-for="item in testimonials"
        :key="item.id"
        class="testimonial-card"
      >
        <div class="testimonial-card__quote">"</div>
        <p class="testimonial-card__text">{{ item.text }}</p>
        <div class="testimonial-card__footer">
          <div class="testimonial-card__avatar">{{ item.initials }}</div>
          <div class="testimonial-card__author">
            <strong class="testimonial-card__name">{{ item.name }}</strong>
            <span class="testimonial-card__detail">{{ item.detail }}</span>
          </div>
          <div class="testimonial-card__badge" :style="{ background: item.levelColor }">
            {{ item.level }}
          </div>
        </div>
        <div class="testimonial-card__stat">
          <span class="testimonial-card__stat-value">{{ item.statValue }}</span>
          <span class="testimonial-card__stat-label">{{ item.statLabel }}</span>
        </div>
      </div>
    </div>

    <!-- Aggregate trust bar -->
    <div class="social-proof__trust-bar">
      <div
        v-for="metric in trustMetrics"
        :key="metric.label"
        class="trust-metric"
      >
        <span class="trust-metric__value">{{ metric.value }}</span>
        <span class="trust-metric__label">{{ metric.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const testimonials = [
  {
    id: 1,
    text: 'Recuperei meu investimento em 3 meses com o bônus de indicação. Hoje estou no Nível Ouro e ganhando mais do que esperava.',
    name: 'João S.',
    initials: 'JS',
    detail: '18 cotas • Sócio há 8 meses',
    level: '🥇 Ouro',
    levelColor: '#D97706',
    statValue: 'R$ 4.200',
    statLabel: 'ganhos no último mês',
  },
  {
    id: 2,
    text: 'No começo tinha medo. Fiz o pacote Padrão e já entrei como Platinum. Em 2 meses indiquei 5 amigos e o dinheiro começou a funcionar sozinho.',
    name: 'Ana C.',
    initials: 'AC',
    detail: '15 cotas • Sócio há 5 meses',
    level: '⭐ Platinum',
    levelColor: '#9BA3AF',
    statValue: '5 diretos',
    statLabel: 'indicados ativos',
  },
  {
    id: 3,
    text: 'Sou empreendedor e já vi muita coisa. O modelo da Ciano é sólido porque tem ativo real: hotéis de verdade gerando caixa todo mês.',
    name: 'Marcos R.',
    initials: 'MR',
    detail: '50 cotas • Sócio há 14 meses',
    level: '💎 Diamante',
    levelColor: '#38BDF8',
    statValue: 'R$ 12.500',
    statLabel: 'ganhos no último mês',
  },
];

const trustMetrics = [
  { value: '1.200+', label: 'Sócios Ativos' },
  { value: 'R$ 3M+', label: 'Distribuídos sem Atrasos' },
  { value: '4 Hotéis', label: 'Ativos no Portfólio' },
  { value: '100%', label: 'Dividendos Pagos em Dia' },
];
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.social-proof {
  &__header {
    text-align: center;
    margin-bottom: $spacing-8;
  }

  &__eyebrow {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: $primary-600;
    margin-bottom: $spacing-3;
  }

  &__title {
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 800;
    margin: 0 0 $spacing-2;
  }

  &__subtitle {
    font-size: 0.9375rem;
    color: $text-secondary;
    margin: 0;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-5;
    margin-bottom: $spacing-8;

    @media (max-width: 900px) { grid-template-columns: 1fr; }
    @media (min-width: 576px) and (max-width: 900px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  &__trust-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: $spacing-4;
    background: linear-gradient(135deg, $primary-900, #0a2f35);
    border-radius: 16px;
    padding: $spacing-6 $spacing-8;

    @media (max-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
      padding: $spacing-5;
    }
  }
}

// ─── Testimonial Card ─────────────────────────────────────
.testimonial-card {
  background: $bg-primary;
  border: 1px solid $border-light;
  border-radius: 18px;
  padding: $spacing-6;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: $spacing-4;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.08);
  }

  &__quote {
    font-size: 4rem;
    line-height: 1;
    color: $primary-100;
    font-family: Georgia, serif;
    height: 1.5rem;
    overflow: visible;
    margin-bottom: -$spacing-3;
  }

  &__text {
    font-size: 0.9375rem;
    color: $text-secondary;
    line-height: 1.7;
    flex: 1;
    margin: 0;
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: $spacing-3;
  }

  &__avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, $primary-500, $secondary-500);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.875rem;
    flex-shrink: 0;
  }

  &__author {
    flex: 1;
  }

  &__name {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
  }

  &__detail {
    display: block;
    font-size: 0.75rem;
    color: $text-tertiary;
  }

  &__badge {
    font-size: 0.6875rem;
    font-weight: 700;
    color: white;
    padding: 3px 10px;
    border-radius: 999px;
    white-space: nowrap;
  }

  &__stat {
    display: flex;
    align-items: baseline;
    gap: $spacing-2;
    padding: $spacing-3 $spacing-4;
    background: linear-gradient(135deg, rgba($secondary-500,0.07), rgba($primary-500,0.05));
    border-radius: 10px;
  }

  &__stat-value {
    font-size: 1.125rem;
    font-weight: 700;
    color: $secondary-700;
  }

  &__stat-label {
    font-size: 0.75rem;
    color: $text-secondary;
  }
}

// ─── Trust Metric ─────────────────────────────────────────
.trust-metric {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;

  &__value {
    font-size: 1.625rem;
    font-weight: 800;
    color: $primary-300;
  }

  &__label {
    font-size: 0.8125rem;
    color: rgba(255,255,255,0.55);
  }
}
</style>
