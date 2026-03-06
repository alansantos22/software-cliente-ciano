import { defineStore } from 'pinia';
import { reactive } from 'vue';

export interface HeroMetric {
  value: string;
  label: string;
}

export const useQuotaPresentationStore = defineStore('quotaPresentation', () => {
  const heroMetrics = reactive<HeroMetric[]>([
    { value: 'R$ 600K', label: 'faturamento anual' },
    { value: '500%',    label: 'crescimento sobre o ano anterior' },
    { value: '4 hotéis', label: 'no portfólio' },
    { value: '100%',    label: 'dividendos em dia, sempre' },
  ]);

  function updateMetric(index: number, field: keyof HeroMetric, newValue: string) {
    if (heroMetrics[index]) {
      heroMetrics[index][field] = newValue;
    }
  }

  return { heroMetrics, updateMetric };
});
