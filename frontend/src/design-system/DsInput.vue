<template>
  <div :class="['ds-input', { 'ds-input--error': hasError, 'ds-input--disabled': disabled }]">
    <label v-if="label" :for="inputId" class="ds-input__label">
      {{ label }}
      <span v-if="required" class="ds-input__required">*</span>
    </label>

    <div class="ds-input__wrapper">
      <span v-if="$slots.prefix" class="ds-input__prefix">
        <slot name="prefix" />
      </span>

      <input
        :id="inputId"
        ref="inputElement"
        v-model="model"
        :type="inputType"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :maxlength="maxlength"
        :autocomplete="autocomplete"
        class="ds-input__field"
        @blur="emit('blur', $event)"
        @focus="emit('focus', $event)"
      />

      <button
        v-if="type === 'password'"
        type="button"
        class="ds-input__toggle-password"
        @click="togglePassword"
      >
        {{ showPassword ? '🙈' : '👁️' }}
      </button>

      <span v-if="$slots.suffix" class="ds-input__suffix">
        <slot name="suffix" />
      </span>
    </div>

    <p v-if="error" class="ds-input__error">{{ error }}</p>
    <p v-else-if="hint" class="ds-input__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  modelValue?: string | number;
  label?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  maxlength?: number;
  autocomplete?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  disabled: false,
  required: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
}>();

const showPassword = ref(false);

const inputId = computed(() => `input-${Math.random().toString(36).slice(2, 9)}`);
const hasError = computed(() => !!props.error);

const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password';
  }
  return props.type;
});

const model = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

function togglePassword() {
  showPassword.value = !showPassword.value;
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.ds-input {
  &__label {
    display: block;
    margin-bottom: $spacing-2;
    font-weight: 500;
    color: $text-primary;
  }

  &__required {
    color: $error;
    margin-left: 2px;
  }

  &__wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  &__field {
    @include input-base;
    padding-right: $spacing-10;
  }

  &__prefix,
  &__suffix {
    position: absolute;
    display: flex;
    align-items: center;
    color: $text-tertiary;
  }

  &__prefix {
    left: $spacing-3;

    & + .ds-input__field {
      padding-left: $spacing-10;
    }
  }

  &__suffix {
    right: $spacing-3;
  }

  &__toggle-password {
    position: absolute;
    right: $spacing-3;
    background: none;
    border: none;
    cursor: pointer;
    padding: $spacing-1;
    font-size: 1rem;
    opacity: 0.7;

    &:hover {
      opacity: 1;
    }
  }

  &__error {
    margin-top: $spacing-1;
    font-size: 0.875rem;
    color: $error;
  }

  &__hint {
    margin-top: $spacing-1;
    font-size: 0.875rem;
    color: $text-tertiary;
  }

  &--error {
    .ds-input__field {
      border-color: $error;

      &:focus {
        box-shadow: 0 0 0 3px rgba($error, 0.2);
      }
    }
  }

  &--disabled {
    opacity: 0.6;
    pointer-events: none;
  }
}
</style>
