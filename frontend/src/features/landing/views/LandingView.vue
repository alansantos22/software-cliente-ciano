<template>
  <div class="landing-view">
    <header class="landing-header">
      <h1>Ciano Pousadas</h1>
      <p>Sistema de Cotas e Bonificação</p>
    </header>

    <section class="landing-hero">
      <h2>Faça parte do nosso grupo!</h2>
      <p>Você foi convidado por um de nossos membros.</p>
      <p v-if="referralCode">Código de Indicação: <strong>{{ referralCode }}</strong></p>
      <router-link to="/login" class="cta-button">
        Cadastre-se Agora
      </router-link>
    </section>

    <p class="placeholder">🚧 Landing Page em construção - Etapa 2 do TODO</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const referralCode = computed(() => route.params.referralCode as string);

onMounted(() => {
  // Save referral code to localStorage
  if (referralCode.value) {
    localStorage.setItem('referralCode', referralCode.value);
  }
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.landing-view {
  min-height: 100vh;
  background: linear-gradient(135deg, $primary-700 0%, $secondary-600 100%);
  color: white;
}

.landing-header {
  text-align: center;
  padding: $spacing-8 $spacing-4;

  h1 {
    font-size: 2.5rem;
    margin-bottom: $spacing-2;
  }

  p {
    opacity: 0.9;
  }
}

.landing-hero {
  text-align: center;
  padding: $spacing-8 $spacing-4;

  h2 {
    font-size: 2rem;
    margin-bottom: $spacing-4;
  }

  p {
    margin-bottom: $spacing-4;
    opacity: 0.9;
  }
}

.cta-button {
  display: inline-block;
  padding: $spacing-4 $spacing-8;
  background: white;
  color: $primary-600;
  font-weight: 600;
  border-radius: $radius-full;
  transition: transform $transition-fast;

  &:hover {
    transform: scale(1.05);
    text-decoration: none;
  }
}

.placeholder {
  text-align: center;
  padding: $spacing-8;
  background: rgba(255, 255, 255, 0.1);
  margin: $spacing-4;
  border-radius: 12px;
}
</style>
