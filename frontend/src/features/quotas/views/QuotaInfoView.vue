<template>
  <div class="quota-info-view">
    <!-- Header -->
    <header class="quota-info-view__header">
      <h1>Informações sobre Cotas</h1>
      <p class="quota-info-view__subtitle">
        Entenda como funciona o sistema de cotas e rendimentos do Grupo Ciano
      </p>
    </header>

    <!-- How It Works -->
    <section class="quota-info-view__section">
      <h2>Como Funciona</h2>
      <div class="how-it-works">
        <div class="step-card">
          <div class="step-card__number">1</div>
          <h3>Adquira Cotas</h3>
          <p>Escolha um pacote de cotas e realize seu investimento</p>
        </div>
        <div class="step-card">
          <div class="step-card__number">2</div>
          <h3>Receba Dividendos</h3>
          <p>Ganhe dividendos mensais proporcionais às suas cotas</p>
        </div>
        <div class="step-card">
          <div class="step-card__number">3</div>
          <h3>Indique Amigos</h3>
          <p>Ganhe comissões por indicações diretas e da rede</p>
        </div>
        <div class="step-card">
          <div class="step-card__number">4</div>
          <h3>Evolua na Carreira</h3>
          <p>Suba de título e desbloqueie novos benefícios</p>
        </div>
      </div>
    </section>

    <!-- Available Packages -->
    <section class="quota-info-view__section">
      <h2>Pacotes Disponíveis</h2>
      <div class="packages-grid">
        <DsCard
          v-for="pkg in packages"
          :key="pkg.id"
          class="package-card"
          :class="{ 'package-card--popular': pkg.popular }"
        >
          <div v-if="pkg.popular" class="package-card__badge">
            <font-awesome-icon icon="star" />
            Mais Popular
          </div>
          <h3 class="package-card__title">{{ pkg.name }}</h3>
          <div class="package-card__quotas">
            <strong>{{ pkg.quotas }}</strong> cotas
          </div>
          <div class="package-card__price">
            {{ formatCurrency(pkg.price) }}
          </div>
          <ul class="package-card__benefits">
            <li v-for="benefit in pkg.benefits" :key="benefit">
              <font-awesome-icon icon="check" class="benefit-check" />
              {{ benefit }}
            </li>
          </ul>
          <DsButton variant="primary" @click="goToCheckout(pkg.id)">
            Adquirir
          </DsButton>
        </DsCard>
      </div>
    </section>

    <!-- Earnings Types -->
    <section class="quota-info-view__section">
      <h2>Tipos de Ganhos</h2>
      <div class="earnings-grid">
        <DsCard
          v-for="earning in earningTypes"
          :key="earning.type"
          class="earning-card"
        >
          <span class="earning-card__icon">
            <font-awesome-icon :icon="earning.faIcon" />
          </span>
          <h3>{{ earning.label }}</h3>
          <p>{{ earning.description }}</p>
          <DsBadge :variant="earning.variant">
            {{ earning.percentage }}
          </DsBadge>
        </DsCard>
      </div>
    </section>

    <!-- Career Titles -->
    <section class="quota-info-view__section">
      <h2>Plano de Carreira</h2>
      <p class="quota-info-view__section-desc">Evolua seu título e desbloqueie novos benefícios conforme cresce sua rede</p>
      <div class="career-grid">
        <div
          v-for="(tier, idx) in careerData"
          :key="tier.title"
          class="career-card"
          :style="{ '--tier-color': tier.color }"
        >
          <div class="career-card__header">
            <div class="career-card__icon-wrap">
              <font-awesome-icon :icon="tier.faIcon" class="career-card__fa-icon" />
            </div>
            <div class="career-card__tier-badge">Nível {{ idx + 1 }}</div>
          </div>
          <h3 class="career-card__title" :style="{ color: tier.color }">{{ tier.title }}</h3>
          <p class="career-card__requirement">
            <font-awesome-icon icon="shield-halved" class="career-card__req-icon" />
            {{ tier.requirement }}
          </p>
          <ul class="career-card__benefits">
            <li v-for="benefit in tier.benefits" :key="benefit">
              <font-awesome-icon icon="check" class="career-card__check" />
              {{ benefit }}
            </li>
          </ul>
          <DsButton variant="outline" size="sm" class="career-card__cta" @click="goToCheckout()">
            Alcançar este nível
          </DsButton>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="quota-info-view__section">
      <h2>Perguntas Frequentes</h2>
      <DsAccordion :items="faqItems" />
    </section>

    <!-- CTA -->
    <section class="quota-info-view__cta">
      <DsCard class="cta-card">
        <h2>Pronto para Começar?</h2>
        <p>Adquira suas cotas agora e comece a receber seus dividendos!</p>
        <DsButton variant="primary" size="lg" @click="goToCheckout()">
          Adquirir Cotas
        </DsButton>
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  DsCard,
  DsButton,
  DsBadge,
  DsAccordion,
} from '@/design-system';
import { mockQuotaConfig } from '@/mocks';

const router = useRouter();

// Local mock data for quota packages
interface QuotaPackage {
  id: string;
  name: string;
  quotas: number;
  price: number;
  popular?: boolean;
  benefits: string[];
}

interface EarningType {
  type: string;
  label: string;
  icon: string;
  faIcon: string;
  description: string;
  percentage: string;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'primary';
}

const localQuotaPackages: QuotaPackage[] = [
  {
    id: 'basic',
    name: 'Básico',
    quotas: 5,
    price: 5 * mockQuotaConfig.quotaPrice,
    benefits: ['Acesso ao sistema', 'Dividendos mensais', 'Indicação direta 10%'],
  },
  {
    id: 'standard',
    name: 'Padrão',
    quotas: 15,
    price: 15 * mockQuotaConfig.quotaPrice,
    popular: true,
    benefits: ['Todos do Básico', 'Bônus de rede nível 1-2', 'Suporte prioritário'],
  },
  {
    id: 'premium',
    name: 'Premium',
    quotas: 50,
    price: 50 * mockQuotaConfig.quotaPrice,
    benefits: ['Todos do Padrão', 'Bônus de rede nível 1-5', 'Acesso VIP', 'Consultor dedicado'],
  },
];

const localEarningTypes: EarningType[] = [
  {
    type: 'direct_commission',
    label: 'Comissão Direta',
    icon: '💵',
    faIcon: 'handshake',
    description: 'Ganhe comissão sobre vendas de seus indicados diretos',
    percentage: '10-20%',
  },
  {
    type: 'network_bonus',
    label: 'Bônus de Rede',
    icon: '🌐',
    faIcon: 'network-wired',
    description: 'Receba bônus sobre vendas de toda sua rede',
    percentage: '2-8%',
  },
  {
    type: 'dividend',
    label: 'Dividendos',
    icon: '📊',
    faIcon: 'chart-line',
    description: 'Dividendos mensais proporcionais às suas cotas',
    percentage: 'Variável',
  },
  {
    type: 'career_bonus',
    label: 'Bônus de Carreira',
    icon: '🏆',
    faIcon: 'trophy',
    description: 'Bônus extras ao atingir novos títulos',
    percentage: '2-10%',
  },
  {
    type: 'retention_bonus',
    label: 'Bônus de Retenção',
    icon: '🔁',
    faIcon: 'rotate',
    description: 'Ganhos recorrentes por manter cotistas ativos',
    percentage: '1-5%',
  },
];

// Data
const packages = computed(() => localQuotaPackages);

const earningTypes = computed(() =>
  localEarningTypes.map(e => ({
    ...e,
    variant: getEarningVariant(e.type),
  }))
);

const careerData = [
  {
    title: 'Bronze',
    icon: '🥉',
    faIcon: 'medal',
    color: '#CD7F32',
    requirement: 'Compra inicial de cotas',
    benefits: ['Comissão direta 10%', 'Bônus de rede nível 1'],
  },
  {
    title: 'Prata',
    icon: '🥈',
    faIcon: 'medal',
    color: '#9BA3AF',
    requirement: '10 indicados diretos ativos',
    benefits: ['Comissão direta 12%', 'Bônus de rede nível 1-2', 'Bônus carreira 2%'],
  },
  {
    title: 'Ouro',
    icon: '🥇',
    faIcon: 'trophy',
    color: '#D97706',
    requirement: '25 indicados diretos + 100 na rede',
    benefits: ['Comissão direta 15%', 'Bônus de rede nível 1-3', 'Bônus carreira 5%'],
  },
  {
    title: 'Diamante',
    icon: '💎',
    faIcon: 'gem',
    color: '#0891B2',
    requirement: '50 indicados diretos + 500 na rede',
    benefits: ['Comissão direta 20%', 'Bônus de rede nível 1-5', 'Bônus carreira 10%', 'Participação especial'],
  },
];

const faqItems = [
  {
    title: 'O que são cotas?',
    content: 'Cotas são participações no Grupo Ciano de Pousadas. Ao adquirir cotas, você se torna sócio do grupo e passa a receber dividendos mensais proporcionais à sua participação.',
  },
  {
    title: 'Como são calculados os dividendos?',
    content: 'Os dividendos são calculados mensalmente com base no faturamento do grupo de pousadas. Cada cota representa uma participação proporcional nos lucros distribuídos.',
  },
  {
    title: 'Como funcionam as comissões de indicação?',
    content: 'Ao indicar novos cotistas, você recebe comissão direta sobre a compra de cotas deles. Além disso, você também recebe bônus de rede quando seus indicados fazem suas próprias indicações.',
  },
  {
    title: 'Posso vender minhas cotas?',
    content: 'Sim, as cotas podem ser transferidas ou vendidas para outros participantes do programa, seguindo as regras estabelecidas no contrato.',
  },
  {
    title: 'Como recebo meus pagamentos?',
    content: 'Os pagamentos são realizados mensalmente via PIX, diretamente na chave cadastrada em seu perfil. O fechamento acontece todo dia 25 e o pagamento até o dia 5 do mês seguinte.',
  },
  {
    title: 'Qual o valor mínimo para investir?',
    content: `O investimento mínimo é de ${formatCurrency(localQuotaPackages[0]?.price || 500)}, correspondente ao pacote inicial de ${localQuotaPackages[0]?.quotas || 5} cotas.`,
  },
];

// Methods
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function getEarningVariant(type: string): 'default' | 'success' | 'warning' | 'info' | 'primary' {
  const variants: Record<string, 'default' | 'success' | 'warning' | 'info' | 'primary'> = {
    direct_commission: 'success',
    network_bonus: 'info',
    dividend: 'primary',
    career_bonus: 'warning',
    retention_bonus: 'success',
    special_bonus: 'primary',
  };
  return variants[type] || 'default';
}

function goToCheckout(packageId?: string) {
  if (packageId) {
    router.push({ path: '/checkout', query: { package: packageId } });
  } else {
    router.push('/checkout');
  }
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.quota-info-view {
  padding: $spacing-6;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: $spacing-4;
  }

  &__header {
    text-align: center;
    margin-bottom: $spacing-8;

    h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: $spacing-2;
    }
  }

  &__subtitle {
    color: $text-secondary;
    font-size: 1.125rem;
    margin: 0;
  }

  &__section {
    margin-bottom: $spacing-8;

    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: $spacing-2;
      text-align: center;
    }
  }

  &__section-desc {
    text-align: center;
    color: $text-secondary;
    font-size: 0.9375rem;
    margin-bottom: $spacing-6;
    margin-top: 0;
  }

  &__cta {
    margin-top: $spacing-8;
  }
}

.how-it-works {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-4;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
}

.step-card {
  @include card;
  text-align: center;
  padding: $spacing-6;

  &__number {
    width: 48px;
    height: 48px;
    margin: 0 auto $spacing-4;
    background: linear-gradient(135deg, $primary-500, $secondary-500);
    color: white;
    border-radius: 50%;
    @include flex-center;
    font-size: 1.5rem;
    font-weight: 700;
  }

  h3 {
    font-size: 1.125rem;
    margin-bottom: $spacing-2;
  }

  p {
    color: $text-secondary;
    font-size: 0.875rem;
    margin: 0;
  }
}

.packages-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-4;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.package-card {
  position: relative;
  text-align: center;
  padding: $spacing-6 !important;

  &--popular {
    border: 2px solid $primary-500;
    transform: scale(1.05);

    @media (max-width: 768px) {
      transform: none;
    }
  }

  &__badge {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, $warning, #c49a00);
    color: white;
    padding: 5px 14px;
    border-radius: $radius-full;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }

  &__title {
    font-size: 1.25rem;
    margin-bottom: $spacing-2;
  }

  &__quotas {
    color: $text-secondary;
    margin-bottom: $spacing-3;

    strong {
      color: $primary-600;
      font-size: 1.5rem;
    }
  }

  &__price {
    font-size: 1.75rem;
    font-weight: 700;
    color: $primary-600;
    margin-bottom: $spacing-4;
  }

  &__benefits {
    list-style: none;
    padding: 0;
    margin: 0 0 $spacing-4;
    text-align: left;
    font-size: 0.875rem;
    color: $text-secondary;

    li {
      display: flex;
      align-items: flex-start;
      gap: $spacing-2;
      padding: 5px 0;
    }
  }
}

.benefit-check {
  color: $success;
  margin-top: 2px;
  flex-shrink: 0;
  font-size: 0.75rem;
}

.earnings-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-4;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
}

.earning-card {
  text-align: center;
  padding: $spacing-5 !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: $shadow-md;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    margin: 0 auto $spacing-4;
    background: linear-gradient(135deg, rgba($primary-500, 0.15), rgba($secondary-500, 0.1));
    border-radius: 14px;
    font-size: 1.25rem;
    color: $primary-600;
  }

  h3 {
    font-size: 1rem;
    margin-bottom: $spacing-2;
  }

  p {
    color: $text-secondary;
    font-size: 0.875rem;
    margin-bottom: $spacing-3;
  }
}

// ============================================================
// CAREER GRID
// ============================================================
.career-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-5;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 576px)  { grid-template-columns: 1fr; }
}

.career-card {
  position: relative;
  background: $bg-primary;
  border: 1px solid $border-light;
  border-radius: 16px;
  padding: $spacing-5;
  border-top: 4px solid var(--tier-color);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-4;
  }

  &__icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--tier-color);
    font-size: 1.375rem;
  }

  &__tier-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: $text-tertiary;
    background: $neutral-100;
    padding: 3px 10px;
    border-radius: 999px;
  }

  &__title {
    font-size: 1.375rem;
    font-weight: 700;
    margin: 0 0 $spacing-3;
  }

  &__requirement {
    display: flex;
    align-items: flex-start;
    gap: $spacing-2;
    font-size: 0.8125rem;
    color: $text-secondary;
    margin-bottom: $spacing-4;
    line-height: 1.4;
  }

  &__req-icon {
    color: $info;
    margin-top: 2px;
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  &__benefits {
    list-style: none;
    padding: 0;
    margin: 0 0 $spacing-5;
    display: flex;
    flex-direction: column;
    gap: 6px;

    li {
      display: flex;
      align-items: flex-start;
      gap: $spacing-2;
      font-size: 0.875rem;
      color: $text-secondary;
      line-height: 1.4;
    }
  }

  &__check {
    color: $success;
    font-size: 0.6875rem;
    margin-top: 3px;
    flex-shrink: 0;
  }

  &__cta {
    width: 100%;
    border-color: var(--tier-color) !important;
    color: var(--tier-color) !important;

    &:hover {
      background: var(--tier-color) !important;
      color: #fff !important;
    }
  }
}

// remove old career-table since it's no longer used
.career-table {
  overflow-x: auto;
}

.cta-card {
  text-align: center;
  padding: $spacing-8 !important;
  background: linear-gradient(135deg, $primary-50, $secondary-50);

  h2 {
    font-size: 1.5rem;
    margin-bottom: $spacing-2;
  }

  p {
    color: $text-secondary;
    margin-bottom: $spacing-4;
  }
}
</style>
