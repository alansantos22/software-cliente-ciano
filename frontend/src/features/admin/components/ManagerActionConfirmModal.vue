<template>
  <DsModal
    :model-value="modelValue"
    :title="title"
    size="sm"
    :closable="false"
    :close-on-overlay="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="mgr-confirm">

      <!-- Ícone de status -->
      <div :class="['mgr-confirm__icon', `mgr-confirm__icon--${variant}`]">
        <font-awesome-icon :icon="variant === 'danger' ? 'triangle-exclamation' : 'shield-halved'" />
      </div>

      <!-- Descrição da ação -->
      <p class="mgr-confirm__description">{{ description }}</p>

      <!-- Slot para conteúdo extra (quantidade de cotas, seletor de patrocinador…) -->
      <slot name="extra" />

      <!-- Campo de senha -->
      <DsInput
        ref="passwordInputRef"
        v-model="passwordValue"
        label="Senha Gerente"
        type="password"
        placeholder="Digite a senha de gerente"
        :error="error"
        autocomplete="current-password"
        @keyup.enter="handleConfirm"
      />

    </div>

    <template #footer>
      <div class="mgr-confirm__footer">
        <DsButton variant="ghost" :disabled="loading" @click="handleCancel">
          Cancelar
        </DsButton>
        <DsButton
          :variant="variant === 'danger' ? 'danger' : 'primary'"
          :disabled="!passwordValue.trim() || loading"
          :loading="loading"
          @click="handleConfirm"
        >
          {{ confirmLabel }}
        </DsButton>
      </div>
    </template>
  </DsModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { DsModal, DsInput, DsButton } from '@/design-system';

interface Props {
  modelValue: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
  /** Erro externo — exibido no campo de senha (ex: "Senha incorreta") */
  error?: string;
}

const props = withDefaults(defineProps<Props>(), {
  confirmLabel: 'Confirmar',
  variant: 'default',
  loading: false,
  error: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [password: string];
  cancel: [];
}>();

const passwordValue = ref('');
const passwordInputRef = ref<InstanceType<typeof DsInput> | null>(null);

// Limpa o campo toda vez que o modal abre
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      passwordValue.value = '';
    }
  },
);

function handleConfirm() {
  if (!passwordValue.value.trim() || props.loading) return;
  emit('confirm', passwordValue.value);
}

function handleCancel() {
  emit('update:modelValue', false);
  emit('cancel');
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/mixins' as *;

.mgr-confirm {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;

  &__icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    @include flex-center;
    font-size: 1.5rem;

    &--default {
      background: rgba($primary-500, 0.12);
      color: $primary-600;
    }

    &--danger {
      background: rgba($error, 0.12);
      color: $error;
    }
  }

  &__description {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }

  // Slot de conteúdo extra alinhado à esquerda
  :slotted(.mgr-extra) {
    width: 100%;
    text-align: left;
  }

  .ds-input {
    width: 100%;
    text-align: left;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    width: 100%;
  }
}
</style>
