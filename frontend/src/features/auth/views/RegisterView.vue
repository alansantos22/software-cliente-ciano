<template>
  <div class="register-page">
    <div class="register-panel">

      <!-- Marca -->
      <div class="register-panel__brand">
        <img src="@/assets/logo.svg" alt="Ciano" class="register-panel__logo" />
        <span class="register-panel__brand-name">Ciano</span>
      </div>

      <!-- Cabeçalho -->
      <div class="register-panel__heading">
        <h1 class="register-panel__title">Crie sua conta</h1>
        <p class="register-panel__subtitle">
          Preencha os dados abaixo. Sua conta será ativada após a aquisição de uma cota.
        </p>
      </div>

      <!-- Alerta -->
      <DsAlert v-if="error" type="error" dismissible @dismiss="error = ''">
        {{ error }}
      </DsAlert>
      <DsAlert v-if="success" type="success">
        Cadastro realizado! Redirecionando para o login…
      </DsAlert>

      <!-- Formulário -->
      <form class="register-form" @submit.prevent="handleRegister">

        <!-- Nome completo -->
        <DsInput
          v-model="form.fullName"
          type="text"
          label="Nome completo"
          placeholder="João da Silva"
          :error="errors.fullName"
          required
          @blur="validateField('fullName')"
        />

        <!-- E-mail -->
        <DsInput
          v-model="form.email"
          type="email"
          label="E-mail"
          placeholder="seu@email.com"
          :error="errors.email"
          required
          @blur="validateField('email')"
        />

        <!-- CPF + Telefone lado a lado -->
        <div class="register-form__row">
          <DsInput
            v-model="form.cpf"
            type="text"
            label="CPF"
            placeholder="000.000.000-00"
            :maxlength="14"
            :error="errors.cpf"
            required
            @blur="validateField('cpf')"
          />
          <DsInput
            v-model="form.phone"
            type="text"
            label="Telefone"
            placeholder="(00) 00000-0000"
            :maxlength="15"
            :error="errors.phone"
            @blur="validateField('phone')"
          />
        </div>

        <!-- Cidade + Estado lado a lado -->
        <div class="register-form__row">
          <DsInput
            v-model="form.city"
            type="text"
            label="Cidade"
            placeholder="Ex: São Paulo"
            :error="errors.city"
          />
          <div class="register-form__select-field">
            <label class="register-form__label">Estado</label>
            <select
              v-model="form.state"
              class="register-form__select"
              :class="{ 'register-form__select--error': errors.state }"
            >
              <option value="" disabled>Selecione</option>
              <option v-for="uf in BRAZILIAN_STATES" :key="uf" :value="uf">{{ uf }}</option>
            </select>
            <span v-if="errors.state" class="register-form__field-error">{{ errors.state }}</span>
          </div>
        </div>

        <!-- PIX -->
        <div class="register-form__row">
          <div class="register-form__select-field">
            <label class="register-form__label">Tipo de Chave PIX</label>
            <select v-model="form.pixType" class="register-form__select">
              <option value="" disabled>Selecione</option>
              <option value="cpf">CPF</option>
              <option value="email">E-mail</option>
              <option value="phone">Telefone</option>
              <option value="random">Chave aleatória</option>
            </select>
          </div>
          <DsInput
            v-model="form.pixKey"
            type="text"
            label="Chave PIX"
            :placeholder="pixPlaceholder"
            :error="errors.pixKey"
          />
        </div>

        <!-- Senha + medidor de força -->
        <div class="register-form__password-field">
          <DsInput
            v-model="form.password"
            type="password"
            label="Senha"
            placeholder="Mínimo 8 caracteres"
            :error="errors.password"
            required
            @blur="validateField('password')"
          />
          <div v-if="form.password" class="password-strength">
            <div class="password-strength__bars">
              <span
                v-for="i in 4"
                :key="i"
                class="password-strength__bar"
                :class="{ 'is-active': i <= passwordStrength.score }"
                :data-level="passwordStrength.level"
              />
            </div>
            <span class="password-strength__label" :data-level="passwordStrength.level">
              {{ passwordStrength.label }}
            </span>
          </div>
        </div>
        <DsInput
          v-model="form.confirmPassword"
          type="password"
          label="Confirmar senha"
          placeholder="Repita a senha"
          :error="errors.confirmPassword"
          required
          @blur="validateField('confirmPassword')"
        />

        <!-- Código de indicação (opcional) -->
        <DsInput
          v-model="form.referralCode"
          type="text"
          label="Código de indicação (opcional)"
          placeholder="Ex: CIANO-XXXX"
          :error="errors.referralCode"
          :disabled="isReferralLocked"
        />
        <p v-if="isReferralLocked" class="register-form__referral-hint">
          <font-awesome-icon icon="star" /> Você foi convidado por um patrocinador Ciano.
        </p>

        <DsButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="isLoading"
          class="register-form__submit"
        >
          Criar conta
        </DsButton>
      </form>

      <!-- Selo de segurança -->
      <div class="register-panel__trust">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>Ambiente seguro e criptografado</span>
      </div>

      <!-- Rodapé -->
      <div class="register-panel__footer">
        <p>Já tem conta? <RouterLink to="/login">Entrar</RouterLink></p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { DsInput, DsButton, DsAlert } from '@/design-system';
import { authService } from '@/shared/services/auth.service';

const router = useRouter();
const route  = useRoute();

const isLoading = ref(false);
const error     = ref('');
const success   = ref(false);

const form = reactive({
  fullName:        '',
  email:           '',
  cpf:             '',
  phone:           '',
  city:            '',
  state:           '',
  pixType:         '',
  pixKey:          '',
  password:        '',
  confirmPassword: '',
  referralCode:    '',
});

const BRAZILIAN_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const pixPlaceholder = computed(() => {
  switch (form.pixType) {
    case 'cpf':    return '000.000.000-00';
    case 'email':  return 'seu@email.com';
    case 'phone':  return '(00) 00000-0000';
    case 'random': return 'Cole sua chave aleatória';
    default:       return 'Selecione o tipo primeiro';
  }
});

// CPF algorithm validation
function isValidCPF(raw: string): boolean {
  const d = raw.replace(/\D/g, '');
  if (d.length !== 11) return false;
  if (/^(\d)\1+$/.test(d)) return false; // all same digits (000.000.000-00 etc)
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]!) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9]!)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]!) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(d[10]!);
}

// Máscara automática — CPF: 000.000.000-00
watch(() => form.cpf, (val) => {
  const d = val.replace(/\D/g, '').slice(0, 11);
  let masked = d;
  if (d.length > 9)      masked = `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  else if (d.length > 6) masked = `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  else if (d.length > 3) masked = `${d.slice(0,3)}.${d.slice(3)}`;
  if (masked !== val) form.cpf = masked;
}, { flush: 'sync' });

// Máscara automática — Telefone: (00) 00000-0000
watch(() => form.phone, (val) => {
  const d = val.replace(/\D/g, '').slice(0, 11);
  let masked = d;
  if (d.length > 10)     masked = `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  else if (d.length > 6) masked = `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  else if (d.length > 2) masked = `(${d.slice(0,2)}) ${d.slice(2)}`;
  else if (d.length > 0) masked = `(${d}`;
  if (masked !== val) form.phone = masked;
}, { flush: 'sync' });

// Pré-preenche o código de convite vindo da URL (?ref=CODIGO)
const isReferralLocked = computed(() => !!route.query.ref);

onMounted(() => {
  const refCode = route.query.ref;
  if (refCode && typeof refCode === 'string') {
    form.referralCode = refCode;
  }
});

const errors = reactive({
  fullName:        '',
  email:           '',
  cpf:             '',
  phone:           '',
  city:            '',
  state:           '',
  pixKey:          '',
  password:        '',
  confirmPassword: '',
  referralCode:    '',
});

// ── Medidor de força da senha ───────────────────────────────
const passwordStrength = computed(() => {
  const p = form.password;
  if (!p) return { score: 0, level: '', label: '' };

  const hasMinLength  = p.length >= 8;
  const hasGoodLength = p.length >= 12;
  const hasMixed      = /[A-Z]/.test(p) && /[a-z]/.test(p);
  const hasNumber     = /[0-9]/.test(p);
  const hasSpecial    = /[^A-Za-z0-9]/.test(p);
  const onlyDigits    = /^[0-9]+$/.test(p);
  const onlyLetters   = /^[a-zA-Z]+$/.test(p);

  let score = 0;
  if (hasMinLength)  score++;
  if (hasGoodLength) score++;
  if (hasMixed)      score++;
  if (hasNumber)     score++;
  if (hasSpecial)    score++;

  // "Forte" exige caractere especial — sem especial o máximo é "Boa"
  if (!hasSpecial) score = Math.min(score, 3);
  // Penalidade: apenas dígitos ou apenas letras → nunca passa de "Fraca"
  if (onlyDigits || onlyLetters) score = Math.min(score, 1);
  // Garantir intervalo [1, 4]
  score = Math.max(1, Math.min(score, 4));

  const levels: Record<number, { level: string; label: string }> = {
    1: { level: 'weak',   label: 'Fraca' },
    2: { level: 'fair',   label: 'Razoável' },
    3: { level: 'good',   label: 'Boa' },
    4: { level: 'strong', label: 'Forte' },
  };
  return { score, ...levels[score] };
});

// ── Validação por campo individual (blur) ───────────────────
function validateField(field: string): void {
  const e = errors as Record<string, string>;
  const f = form as Record<string, string>;
  e[field] = '';

  switch (field) {
    case 'fullName':
      if (!f.fullName?.trim()) e.fullName = 'Nome é obrigatório';
      break;

    case 'email':
      if (!f.email) {
        e.email = 'E-mail é obrigatório';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
        e.email = 'E-mail inválido';
      }
      break;

    case 'cpf':
      if (!f.cpf) {
        e.cpf = 'CPF é obrigatório';
      } else if (f.cpf.replace(/\D/g, '').length !== 11) {
        e.cpf = 'CPF incompleto — insira todos os 11 dígitos';
      } else if (!isValidCPF(f.cpf)) {
        e.cpf = 'CPF inválido';
      }
      break;

    case 'phone':
      if (f.phone) {
        const d = f.phone.replace(/\D/g, '');
        if (d.length < 10 || d.length > 11) e.phone = 'Telefone inválido (DDD + número)';
      }
      break;

    case 'pixKey':
      if (form.pixType && f.pixKey) {
        if (form.pixType === 'cpf' && f.pixKey.replace(/\D/g, '').length !== 11)
          e.pixKey = 'CPF da chave PIX deve ter 11 dígitos';
        else if (form.pixType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.pixKey))
          e.pixKey = 'E-mail da chave PIX inválido';
        else if (form.pixType === 'phone') {
          const d = f.pixKey.replace(/\D/g, '');
          if (d.length < 10 || d.length > 11) e.pixKey = 'Telefone da chave PIX inválido';
        }
      }
      break;

    case 'password':
      if (!f.password) {
        e.password = 'Senha é obrigatória';
      } else if (f.password.length < 8) {
        e.password = 'Mínimo de 8 caracteres';
      } else if (passwordStrength.value.score < 2) {
        e.password = 'Senha muito fraca — use maiúsculas, números ou caracteres especiais';
      }
      // re-check confirm if already touched
      if (errors.confirmPassword && f.password !== f.confirmPassword)
        e.confirmPassword = 'As senhas não coincidem';
      break;

    case 'confirmPassword':
      if (!f.confirmPassword) {
        e.confirmPassword = 'Confirme a senha';
      } else if (f.password !== f.confirmPassword) {
        e.confirmPassword = 'As senhas não coincidem';
      }
      break;
  }
}

function validate(): boolean {
  let valid = true;

  // Limpar
  Object.keys(errors).forEach((k) => ((errors as Record<string, string>)[k] = ''));

  if (!form.fullName.trim()) {
    errors.fullName = 'Nome é obrigatório';
    valid = false;
  }

  if (!form.email) {
    errors.email = 'E-mail é obrigatório';
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'E-mail inválido';
    valid = false;
  }

  if (!form.cpf) {
    errors.cpf = 'CPF é obrigatório';
    valid = false;
  } else if (form.cpf.replace(/\D/g, '').length !== 11) {
    errors.cpf = 'CPF incompleto — insira todos os 11 dígitos';
    valid = false;
  } else if (!isValidCPF(form.cpf)) {
    errors.cpf = 'CPF inválido';
    valid = false;
  }

  if (form.phone) {
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      errors.phone = 'Telefone inválido (DDD + número)';
      valid = false;
    }
  }

  if (form.pixType && form.pixKey) {
    if (form.pixType === 'cpf' && form.pixKey.replace(/\D/g, '').length !== 11) {
      errors.pixKey = 'CPF da chave PIX deve ter 11 dígitos';
      valid = false;
    } else if (form.pixType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.pixKey)) {
      errors.pixKey = 'E-mail da chave PIX inválido';
      valid = false;
    } else if (form.pixType === 'phone') {
      const pix = form.pixKey.replace(/\D/g, '');
      if (pix.length < 10 || pix.length > 11) {
        errors.pixKey = 'Telefone da chave PIX inválido';
        valid = false;
      }
    }
  }

  if (!form.password) {
    errors.password = 'Senha é obrigatória';
    valid = false;
  } else if (form.password.length < 8) {
    errors.password = 'Mínimo de 8 caracteres';
    valid = false;
  } else if (passwordStrength.value.score < 2) {
    errors.password = 'Senha muito fraca — use maiúsculas, números ou caracteres especiais';
    valid = false;
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirme a senha';
    valid = false;
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'As senhas não coincidem';
    valid = false;
  }

  return valid;
}

async function handleRegister() {
  error.value = '';
  if (!validate()) {
    const firstError = document.querySelector('.ds-input--error, .register-form__select--error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  isLoading.value = true;

  try {
    await authService.register({
      name: form.fullName,
      cpf: form.cpf.replace(/\D/g, ''),
      email: form.email,
      phone: form.phone.replace(/\D/g, ''),
      city: form.city,
      state: form.state,
      pixKey: form.pixKey,
      password: form.password,
      referralCode: form.referralCode || undefined,
    });
    success.value = true;
    setTimeout(() => router.push('/login'), 2000);
  } catch (e: any) {
    const msg = e?.response?.data?.message;
    if (Array.isArray(msg)) {
      error.value = msg.join(' • ');
    } else if (typeof msg === 'string') {
      error.value = msg;
    } else {
      error.value = 'Erro ao realizar cadastro. Tente novamente.';
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors'  as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins'  as *;

// ═══════════════════════════════════════════════════════════════
// WRAPPER
// ═══════════════════════════════════════════════════════════════
.register-page {
  min-height: 100vh;
  background: var(--bg-secondary);
  @include flex-center;
  padding: $spacing-8 $spacing-4;
}

// ═══════════════════════════════════════════════════════════════
// PAINEL — Formulário
// ═══════════════════════════════════════════════════════════════
.register-panel {
  background: var(--bg-primary);
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
  padding: $spacing-8;
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: $spacing-6;

  // ── Marca ──
  &__brand {
    display: flex;
    align-items: center;
    gap: $spacing-3;
  }

  &__logo {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }

  &__brand-name {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--primary-700);
    letter-spacing: -0.03em;
  }

  // ── Títulos ──
  &__heading {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
  }

  &__title {
    font-size: 1.625rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.25;
    margin: 0;
    letter-spacing: -0.02em;
  }

  &__subtitle {
    font-size: 0.9375rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
  }

  // ── Selo de segurança ──
  &__trust {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    color: var(--text-tertiary);
    font-size: 0.8125rem;
    justify-content: center;

    svg { color: var(--color-success); }
  }

  // ── Rodapé ──
  &__footer {
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin: 0;

    a {
      color: var(--primary-600);
      text-decoration: none;
      font-weight: 600;

      &:hover { text-decoration: underline; }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// FORMULÁRIO
// ═══════════════════════════════════════════════════════════════
.register-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-4;

    @media (max-width: 480px) {
      grid-template-columns: 1fr;
    }
  }

  &__submit { width: 100%; margin-top: $spacing-1; }

  &__select-field {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
  }

  &__label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  &__select {
    height: 44px;
    padding: 0 $spacing-3;
    border: 1.5px solid var(--border-default);
    border-radius: 10px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.9375rem;
    transition: border-color 0.2s;
    appearance: auto;

    &:focus {
      outline: none;
      border-color: var(--primary-500);
    }

    &--error {
      border-color: var(--color-error);
    }
  }

  &__field-error {
    font-size: 0.8125rem;
    color: var(--color-error);
    margin-top: 2px;
  }

  // ── Campo de senha + medidor ──
  &__password-field {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
  }
}

// ═══════════════════════════════════════════════════════════════
// MEDIDOR DE FORÇA DA SENHA
// ═══════════════════════════════════════════════════════════════
.password-strength {
  display: flex;
  align-items: center;
  gap: $spacing-3;

  &__bars {
    display: flex;
    gap: 4px;
    flex: 1;
  }

  &__bar {
    flex: 1;
    height: 4px;
    border-radius: 99px;
    background: var(--border-default);
    transition: background 0.25s ease;

    &.is-active {
      &[data-level='weak']   { background: #ef4444; }
      &[data-level='fair']   { background: #f97316; }
      &[data-level='good']   { background: #eab308; }
      &[data-level='strong'] { background: #22c55e; }
    }
  }

  &__label {
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    min-width: 60px;
    text-align: right;

    &[data-level='weak']   { color: #ef4444; }
    &[data-level='fair']   { color: #f97316; }
    &[data-level='good']   { color: #eab308; }
    &[data-level='strong'] { color: #22c55e; }
  }
}

.register-form {
  &__referral-hint {
    margin-top: calc(-1 * #{$spacing-2});
    font-size: 0.8125rem;
    color: var(--primary-700);
    background: var(--primary-50);
    border: 1px solid var(--primary-100);
    border-radius: 8px;
    padding: $spacing-2 $spacing-3;
  }
}
</style>
