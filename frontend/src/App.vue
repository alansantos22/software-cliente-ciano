<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore, useAppStore } from '@/shared/stores';

const authStore = useAuthStore();
const appStore = useAppStore();

onMounted(() => {
  // Load stored preferences
  appStore.loadPreferences();
  authStore.loadFromStorage();
});
</script>

<template>
  <router-view />
</template>

<style lang="scss">
// Global styles are imported in main.ts
</style>
