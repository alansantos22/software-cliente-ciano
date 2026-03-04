<template>
  <div class="landing">

    <!-- ── HERO ────────────────────────────────────────────────── -->
    <section class="landing__hero">
      <div class="landing__hero-content">
        <span class="landing__hero-badge">Convite Exclusivo</span>
        <h1 class="landing__hero-title">
          Invista em <span class="landing__hero-highlight">hospedagem</span>
          e ganhe com sua rede
        </h1>
        <p class="landing__hero-subtitle">
          Adquira cotas em pousadas de alto padrão e receba bonificações recorrentes.
          Um modelo inovador de investimento compartilhado.
        </p>

        <div v-if="referralCode" class="landing__hero-referral">
          <font-awesome-icon icon="star" />
          Você foi convidado! Código: <strong>{{ referralCode }}</strong>
        </div>

        <div class="landing__hero-actions">
          <RouterLink
            :to="registerLink"
            class="landing__cta landing__cta--primary"
          >
            Criar minha conta
          </RouterLink>
          <a href="#como-funciona" class="landing__cta landing__cta--outline">
            Como funciona?
          </a>
        </div>
      </div>
    </section>

    <!-- ── QUEM SOMOS ──────────────────────────────────────────── -->
    <section id="quem-somos" class="landing__section landing__about">
      <div class="landing__container">
        <h2 class="landing__section-title">Quem Somos</h2>
        <p class="landing__section-subtitle">
          A <strong>Ciano Pousadas</strong> é um grupo hoteleiro que une conforto, natureza
          e oportunidades de investimento. Nossas pousadas estão localizadas em destinos
          turísticos estratégicos, oferecendo experiências únicas aos hóspedes.
        </p>

        <div class="landing__about-grid">
          <div class="landing__about-card">
            <div class="landing__about-icon">
              <font-awesome-icon icon="hotel" />
            </div>
            <h3>Pousadas Premium</h3>
            <p>Estruturas de alto padrão em localizações privilegiadas, cercadas por natureza.</p>
          </div>
          <div class="landing__about-card">
            <div class="landing__about-icon">
              <font-awesome-icon icon="chart-line" />
            </div>
            <h3>Investimento Inteligente</h3>
            <p>Modelo de cotas que permite participação nos resultados do grupo hoteleiro.</p>
          </div>
          <div class="landing__about-card">
            <div class="landing__about-icon">
              <font-awesome-icon icon="users" />
            </div>
            <h3>Comunidade Ativa</h3>
            <p>Uma rede de investidores que crescem juntos compartilhando oportunidades.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── GALERIA DE POUSADAS ─────────────────────────────────── -->
    <section class="landing__section landing__gallery">
      <div class="landing__container">
        <h2 class="landing__section-title">Nossas Pousadas</h2>
        <p class="landing__section-subtitle">
          Conheça os destinos onde seu investimento ganha vida.
        </p>

        <div class="landing__gallery-grid">
          <div
            v-for="inn in inns"
            :key="inn.name"
            class="landing__inn-card"
          >
            <div class="landing__inn-image" :style="{ background: inn.gradient }">
              <font-awesome-icon :icon="inn.icon" class="landing__inn-icon" />
            </div>
            <div class="landing__inn-info">
              <h3>{{ inn.name }}</h3>
              <p>{{ inn.location }}</p>
              <span class="landing__inn-tag">{{ inn.rooms }} quartos</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── COMO FUNCIONA ───────────────────────────────────────── -->
    <section id="como-funciona" class="landing__section landing__steps">
      <div class="landing__container">
        <h2 class="landing__section-title">Como Funciona</h2>
        <p class="landing__section-subtitle">
          Em 4 passos simples você começa a investir e a ganhar.
        </p>

        <div class="landing__steps-grid">
          <div
            v-for="(step, i) in steps"
            :key="i"
            class="landing__step"
          >
            <div class="landing__step-number">{{ i + 1 }}</div>
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── SISTEMA DE TÍTULOS ──────────────────────────────────── -->
    <section class="landing__section landing__titles">
      <div class="landing__container">
        <h2 class="landing__section-title">Sistema de Títulos</h2>
        <p class="landing__section-subtitle">
          Conforme sua rede cresce, você avança de título e desbloqueia mais benefícios.
        </p>

        <div class="landing__titles-grid">
          <div
            v-for="title in titles"
            :key="title.name"
            class="landing__title-card"
            :style="{ '--title-color': title.color, '--title-bg': title.bg }"
          >
            <div class="landing__title-badge">{{ title.icon }}</div>
            <h3>{{ title.name }}</h3>
            <p>{{ title.requirement }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── CTA FINAL ──────────────────────────────────────────── -->
    <section class="landing__section landing__final-cta">
      <div class="landing__container">
        <h2>Pronto para começar?</h2>
        <p>Junte-se à comunidade Ciano e comece a investir de forma inteligente.</p>
        <RouterLink
          :to="registerLink"
          class="landing__cta landing__cta--primary landing__cta--large"
        >
          Criar minha conta agora
        </RouterLink>
      </div>
    </section>

    <!-- ── FOOTER ─────────────────────────────────────────────── -->
    <footer class="landing__footer">
      <p>&copy; {{ currentYear }} Ciano Pousadas. Todos os direitos reservados.</p>
    </footer>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const currentYear = new Date().getFullYear();

const referralCode = computed(() => route.params.referralCode as string);

const registerLink = computed(() =>
  referralCode.value ? `/register?ref=${referralCode.value}` : '/register',
);

onMounted(() => {
  if (referralCode.value) {
    localStorage.setItem('referralCode', referralCode.value);
  }
});

// ── Static data ──────────────────────────────────────────────────────────────
const inns = [
  {
    name: 'Pousada Ciano Mar',
    location: 'Praia do Rosa, SC',
    rooms: 24,
    gradient: 'linear-gradient(135deg, #0097a7 0%, #00bcd4 100%)',
    icon: 'umbrella-beach',
  },
  {
    name: 'Pousada Ciano Serra',
    location: 'Monte Verde, MG',
    rooms: 18,
    gradient: 'linear-gradient(135deg, #388e3c 0%, #66bb6a 100%)',
    icon: 'mountain',
  },
  {
    name: 'Pousada Ciano Lago',
    location: 'Capitólio, MG',
    rooms: 20,
    gradient: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
    icon: 'water',
  },
];

const steps = [
  { title: 'Crie sua conta',        description: 'Cadastre-se gratuitamente e conheça o sistema de cotas.' },
  { title: 'Adquira cotas',         description: 'Escolha o pacote ideal e faça seu investimento via PIX ou cartão.' },
  { title: 'Construa sua rede',     description: 'Convide amigos usando seu link exclusivo de indicação.' },
  { title: 'Receba bonificações',   description: 'Ganhe com vendas próprias e da sua rede, mês a mês.' },
];

const titles = [
  { name: 'Bronze',   icon: '🥉', color: '#7a4a10', bg: '#fbe9c5', requirement: '3 membros ativos na rede' },
  { name: 'Prata',    icon: '🥈', color: '#4a4a4a', bg: '#ebebeb', requirement: '5 Bronzes diretos + 2 linhas qualificadas' },
  { name: 'Ouro',     icon: '🥇', color: '#7a5800', bg: '#fff5c2', requirement: '5 Pratas diretos + 3 linhas qualificadas' },
  { name: 'Diamante', icon: '💎', color: '#007fa3', bg: '#d9f5fb', requirement: '5 Ouros diretos + 4 linhas qualificadas' },
];
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors'  as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins'  as *;

// ── Shared ──────────────────────────────────────────────────────────────────
.landing {
  background: $bg-primary;
  color: $text-primary;

  &__container {
    max-width: 1140px;
    margin: 0 auto;
    padding: 0 $spacing-6;
  }

  &__section {
    padding: $spacing-20 0;

    @media (max-width: 768px) {
      padding: $spacing-12 0;
    }
  }

  &__section-title {
    text-align: center;
    font-size: 2rem;
    font-weight: 800;
    margin: 0 0 $spacing-3;
    letter-spacing: -0.02em;
    color: $text-primary;
  }

  &__section-subtitle {
    text-align: center;
    font-size: 1.0625rem;
    color: $text-secondary;
    max-width: 600px;
    margin: 0 auto $spacing-10;
    line-height: 1.6;
  }

  // ── CTA buttons ──
  &__cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: $spacing-3 $spacing-8;
    border-radius: $radius-full;
    font-weight: 700;
    font-size: 1rem;
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;
    cursor: pointer;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }

    &--primary {
      background: $primary-600;
      color: white;
    }

    &--outline {
      background: transparent;
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.6);

      &:hover { border-color: white; }
    }

    &--large {
      padding: $spacing-4 $spacing-12;
      font-size: 1.125rem;
    }
  }
}

// ── HERO ──────────────────────────────────────────────────────────────────────
.landing__hero {
  background: linear-gradient(135deg, $primary-800 0%, $primary-600 50%, $secondary-600 100%);
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-16 $spacing-6;
  text-align: center;
  color: white;

  @media (max-width: 768px) {
    min-height: 70vh;
    padding: $spacing-12 $spacing-4;
  }
}

.landing__hero-content {
  max-width: 720px;
}

.landing__hero-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(4px);
  padding: $spacing-1 $spacing-4;
  border-radius: $radius-full;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: $spacing-6;
}

.landing__hero-title {
  font-size: 3rem;
  font-weight: 900;
  line-height: 1.15;
  margin: 0 0 $spacing-5;
  letter-spacing: -0.03em;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
}

.landing__hero-highlight {
  color: $accent-300;
}

.landing__hero-subtitle {
  font-size: 1.125rem;
  line-height: 1.6;
  opacity: 0.9;
  margin: 0 0 $spacing-6;
}

.landing__hero-referral {
  display: inline-flex;
  align-items: center;
  gap: $spacing-2;
  background: rgba(255, 255, 255, 0.15);
  padding: $spacing-2 $spacing-4;
  border-radius: $radius-md;
  font-size: 0.9375rem;
  margin-bottom: $spacing-6;

  svg { color: $accent-400; }
}

.landing__hero-actions {
  display: flex;
  gap: $spacing-4;
  justify-content: center;
  flex-wrap: wrap;
}

// ── ABOUT ─────────────────────────────────────────────────────────────────────
.landing__about-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-6;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: $spacing-4;
  }
}

.landing__about-card {
  background: $bg-secondary;
  border-radius: $radius-xl;
  padding: $spacing-8 $spacing-6;
  text-align: center;
  transition: transform 0.2s;

  &:hover { transform: translateY(-4px); }

  h3 {
    font-size: 1.125rem;
    font-weight: 700;
    margin: $spacing-4 0 $spacing-2;
  }

  p {
    color: $text-secondary;
    font-size: 0.9375rem;
    line-height: 1.5;
    margin: 0;
  }
}

.landing__about-icon {
  width: 56px;
  height: 56px;
  border-radius: $radius-full;
  background: rgba($primary-500, 0.1);
  color: $primary-600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.375rem;
}

// ── GALLERY ───────────────────────────────────────────────────────────────────
.landing__gallery {
  background: $bg-secondary;
}

.landing__gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-6;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: $spacing-4;
  }
}

.landing__inn-card {
  background: $bg-primary;
  border-radius: $radius-xl;
  overflow: hidden;
  box-shadow: $shadow-md;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-lg;
  }
}

.landing__inn-image {
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.landing__inn-icon {
  font-size: 3rem;
  color: rgba(255, 255, 255, 0.7);
}

.landing__inn-info {
  padding: $spacing-5 $spacing-4;

  h3 {
    font-size: 1.0625rem;
    font-weight: 700;
    margin: 0 0 $spacing-1;
  }

  p {
    color: $text-secondary;
    font-size: 0.875rem;
    margin: 0 0 $spacing-3;
  }
}

.landing__inn-tag {
  display: inline-block;
  background: rgba($primary-500, 0.1);
  color: $primary-700;
  padding: 2px $spacing-3;
  border-radius: $radius-full;
  font-size: 0.8125rem;
  font-weight: 600;
}

// ── STEPS ─────────────────────────────────────────────────────────────────────
.landing__steps-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-6;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
}

.landing__step {
  text-align: center;
  padding: $spacing-6;

  h3 {
    font-size: 1rem;
    font-weight: 700;
    margin: $spacing-4 0 $spacing-2;
  }

  p {
    color: $text-secondary;
    font-size: 0.9rem;
    line-height: 1.5;
    margin: 0;
  }
}

.landing__step-number {
  width: 48px;
  height: 48px;
  border-radius: $radius-full;
  background: $primary-600;
  color: white;
  font-size: 1.25rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

// ── TITLES ────────────────────────────────────────────────────────────────────
.landing__titles {
  background: $bg-secondary;
}

.landing__titles-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-5;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
}

.landing__title-card {
  background: $bg-primary;
  border-radius: $radius-xl;
  padding: $spacing-6;
  text-align: center;
  border: 2px solid var(--title-bg);
  transition: transform 0.2s;

  &:hover { transform: translateY(-4px); }

  h3 {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--title-color);
    margin: $spacing-3 0 $spacing-2;
  }

  p {
    font-size: 0.875rem;
    color: $text-secondary;
    line-height: 1.45;
    margin: 0;
  }
}

.landing__title-badge {
  font-size: 2rem;
}

// ── FINAL CTA ─────────────────────────────────────────────────────────────────
.landing__final-cta {
  background: linear-gradient(135deg, $primary-700 0%, $primary-500 100%);
  color: white;
  text-align: center;

  h2 {
    font-size: 2rem;
    font-weight: 800;
    margin: 0 0 $spacing-3;
  }

  p {
    font-size: 1.0625rem;
    opacity: 0.9;
    margin: 0 0 $spacing-8;
  }
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
.landing__footer {
  text-align: center;
  padding: $spacing-8 $spacing-4;
  background: $neutral-900;
  color: $neutral-400;
  font-size: 0.875rem;

  p { margin: 0; }
}
</style>
