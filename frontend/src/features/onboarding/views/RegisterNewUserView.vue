<template>
  <div class="register-member">
    <header class="register-member__header">
      <h1 class="register-member__title">Cadastrar Novo Membro</h1>
      <p class="register-member__subtitle">
        Preencha os dados do novo membro. Após salvar, um ID único será gerado automaticamente.
      </p>
    </header>

    <!-- Alerts -->
    <DsAlert v-if="error" type="error" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="createdUser" type="success">
      <strong>Membro cadastrado!</strong> ID gerado:
      <code class="register-member__id">{{ createdUser.id }}</code>
      — {{ createdUser.name }}
    </DsAlert>

    <!-- Form -->
    <DsCard v-if="!createdUser">
      <form class="register-member__form" @submit.prevent="handleSubmit">

        <!-- Dados Pessoais -->
        <h3 class="register-member__section-label">Dados Pessoais</h3>

        <DsInput
          v-model="form.fullName"
          type="text"
          label="Nome completo"
          placeholder="João da Silva"
          :error="errors.fullName"
          required
        />

        <div class="register-member__row">
          <DsInput
            v-model="form.cpf"
            type="text"
            label="CPF"
            placeholder="000.000.000-00"
            :error="errors.cpf"
            required
          />
          <DsInput
            v-model="form.email"
            type="email"
            label="E-mail"
            placeholder="membro@email.com"
            :error="errors.email"
            required
          />
        </div>

        <div class="register-member__row">
          <DsInput
            v-model="form.ddd"
            type="text"
            label="DDD"
            placeholder="11"
            :error="errors.ddd"
            class="register-member__ddd"
            required
          />
          <DsInput
            v-model="form.phone"
            type="text"
            label="Telefone"
            placeholder="99999-0000"
            :error="errors.phone"
            required
          />
        </div>

        <!-- Localização -->
        <h3 class="register-member__section-label">Localização</h3>

        <div class="register-member__row">
          <DsInput
            v-model="form.city"
            type="text"
            label="Cidade"
            placeholder="São Paulo"
            :error="errors.city"
          />
          <div class="register-member__select-wrapper">
            <label class="register-member__label">Estado</label>
            <select v-model="form.state" class="register-member__select">
              <option value="" disabled>UF</option>
              <option v-for="uf in BRAZILIAN_STATES" :key="uf" :value="uf">{{ uf }}</option>
            </select>
          </div>
        </div>

        <!-- PIX -->
        <h3 class="register-member__section-label">Chave PIX</h3>

        <div class="register-member__row">
          <div class="register-member__select-wrapper">
            <label class="register-member__label">Tipo</label>
            <select v-model="form.pixType" class="register-member__select">
              <option value="" disabled>Selecione</option>
              <option value="cpf">CPF</option>
              <option value="email">E-mail</option>
              <option value="phone">Telefone</option>
              <option value="random">Aleatória</option>
            </select>
          </div>
          <DsInput
            v-model="form.pixKey"
            type="text"
            label="Chave PIX"
            :placeholder="pixPlaceholder"
          />
        </div>

        <!-- Cotas (opcional) -->
        <h3 class="register-member__section-label">Compra de Cotas (opcional)</h3>

        <div class="register-member__row">
          <DsInput
            v-model.number="form.quotaCount"
            type="number"
            label="Quantidade de cotas"
            placeholder="0"
            min="0"
          />
          <div class="register-member__select-wrapper">
            <label class="register-member__label">Tipo de cota</label>
            <select v-model="form.quotaType" class="register-member__select">
              <option value="" disabled>Selecione</option>
              <option value="purchased">Comprada</option>
              <option value="split">Split (bonificação)</option>
            </select>
          </div>
        </div>

        <!-- Actions -->
        <div class="register-member__actions">
          <DsButton
            type="submit"
            variant="primary"
            size="lg"
            :loading="isLoading"
          >
            Cadastrar Membro
          </DsButton>
          <DsButton
            type="button"
            variant="outline"
            size="lg"
            @click="resetForm"
          >
            Limpar Formulário
          </DsButton>
        </div>

      </form>
    </DsCard>

    <!-- Success state: register another -->
    <div v-if="createdUser" class="register-member__success-actions">
      <DsButton variant="primary" size="lg" @click="resetForm">
        Cadastrar Outro Membro
      </DsButton>
      <DsButton variant="outline" size="lg" @click="$router.push('/network')">
        Ver Rede
      </DsButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { DsInput, DsButton, DsAlert, DsCard } from '@/design-system';
import { mockDelay } from '@/mocks';

const isLoading = ref(false);
const error = ref('');
const createdUser = ref<{ id: string; name: string } | null>(null);

const BRAZILIAN_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const form = reactive({
  fullName:   '',
  cpf:        '',
  email:      '',
  ddd:        '',
  phone:      '',
  city:       '',
  state:      '',
  pixType:    '',
  pixKey:     '',
  quotaCount: 0,
  quotaType:  '',
});

const errors = reactive({
  fullName: '',
  cpf:      '',
  email:    '',
  ddd:      '',
  phone:    '',
  city:     '',
  state:    '',
});

const pixPlaceholder = computed(() => {
  switch (form.pixType) {
    case 'cpf':    return '000.000.000-00';
    case 'email':  return 'email@exemplo.com';
    case 'phone':  return '(00) 00000-0000';
    case 'random': return 'Cole a chave aleatória';
    default:       return 'Selecione o tipo';
  }
});

function validate(): boolean {
  let valid = true;
  Object.keys(errors).forEach(k => ((errors as Record<string, string>)[k] = ''));

  if (!form.fullName.trim()) { errors.fullName = 'Nome é obrigatório'; valid = false; }
  if (!form.cpf.trim())      { errors.cpf = 'CPF é obrigatório';      valid = false; }
  if (!form.email.trim()) {
    errors.email = 'E-mail é obrigatório';
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'E-mail inválido';
    valid = false;
  }
  if (!form.ddd.trim())   { errors.ddd = 'DDD obrigatório';        valid = false; }
  if (!form.phone.trim()) { errors.phone = 'Telefone obrigatório'; valid = false; }

  return valid;
}

function generateId(): string {
  const num = Math.floor(Math.random() * 900000) + 100000;
  return `CIANO-${num}`;
}

async function handleSubmit() {
  error.value = '';
  if (!validate()) return;

  isLoading.value = true;

  try {
    await mockDelay(800);
    createdUser.value = {
      id: generateId(),
      name: form.fullName,
    };
  } catch {
    error.value = 'Erro ao cadastrar membro. Tente novamente.';
  } finally {
    isLoading.value = false;
  }
}

function resetForm() {
  createdUser.value = null;
  error.value = '';
  Object.keys(form).forEach(k => {
    const obj = form as Record<string, unknown>;
    if (typeof obj[k] === 'number') obj[k] = 0;
    else obj[k] = '';
  });
  Object.keys(errors).forEach(k => ((errors as Record<string, string>)[k] = ''));
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors'  as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins'  as *;

.register-member {
  padding: $spacing-6;
  max-width: 780px;
  margin: 0 auto;

  // ── Header ──
  &__header {
    margin-bottom: $spacing-6;
  }

  &__title {
    font-size: 1.75rem;
    font-weight: 800;
    color: $text-primary;
    margin: 0 0 $spacing-2;
    letter-spacing: -0.02em;
  }

  &__subtitle {
    font-size: 0.9375rem;
    color: $text-secondary;
    margin: 0;
    line-height: 1.5;
  }

  // ── Form ──
  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }

  &__section-label {
    font-size: 0.8125rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: $text-secondary;
    margin: $spacing-4 0 0;
    padding-bottom: $spacing-2;
    border-bottom: 1px solid $border-light;
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-4;

    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  }

  &__ddd {
    max-width: 100px;
  }

  // ── Select ──
  &__select-wrapper {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
  }

  &__label {
    font-size: 0.875rem;
    font-weight: 600;
    color: $text-primary;
  }

  &__select {
    height: 44px;
    padding: 0 $spacing-3;
    border: 1.5px solid $border-default;
    border-radius: 10px;
    background: $bg-primary;
    color: $text-primary;
    font-size: 0.9375rem;
    transition: border-color 0.2s;
    appearance: auto;

    &:focus {
      outline: none;
      border-color: $primary-500;
    }
  }

  // ── Actions ──
  &__actions {
    display: flex;
    gap: $spacing-4;
    margin-top: $spacing-4;
    flex-wrap: wrap;
  }

  // ── Success ──
  &__id {
    font-family: monospace;
    background: rgba($primary-500, 0.1);
    padding: 2px $spacing-2;
    border-radius: $radius-sm;
    font-weight: 700;
    color: $primary-700;
  }

  &__success-actions {
    display: flex;
    gap: $spacing-4;
    margin-top: $spacing-6;
    flex-wrap: wrap;
  }
}
</style>
