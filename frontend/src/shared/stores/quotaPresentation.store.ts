import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { quotasService } from '../services/quotas.service';
import { adminService } from '../services/admin.service';

export interface HeroMetric {
  value: string;
  label: string;
}

const DEFAULT_METRICS: HeroMetric[] = [
  { value: 'R$ 600K', label: 'faturamento anual' },
  { value: '500%',    label: 'crescimento sobre o ano anterior' },
  { value: '4 hotéis', label: 'no portfólio' },
  { value: '100%',    label: 'dividendos em dia, sempre' },
];

export const useQuotaPresentationStore = defineStore('quotaPresentation', () => {
  const heroMetrics = reactive<HeroMetric[]>(DEFAULT_METRICS.map(m => ({ ...m })));
  const isLoaded = ref(false);

  function updateMetric(index: number, field: keyof HeroMetric, newValue: string) {
    if (heroMetrics[index]) {
      heroMetrics[index][field] = newValue;
    }
  }

  function applyList(list: HeroMetric[]) {
    list.forEach((m, i) => {
      if (heroMetrics[i]) {
        heroMetrics[i].value = m?.value ?? heroMetrics[i].value;
        heroMetrics[i].label = m?.label ?? heroMetrics[i].label;
      }
    });
  }

  /** Load metrics from the public endpoint — safe for all users */
  async function loadMetrics() {
    if (isLoaded.value) return;
    try {
      const res = await quotasService.getPresentation();
      const pm = res.data?.presentationMetrics;
      // Formato atual: objeto com `heroMetrics` ao lado de chaves de config.
      const nested = pm && !Array.isArray(pm) && typeof pm === 'object'
        ? (pm as Record<string, unknown>).heroMetrics
        : null;

      if (Array.isArray(nested)) {
        applyList(nested as HeroMetric[]);
        isLoaded.value = true;
      } else if (pm && Array.isArray(pm)) {
        // Legacy format: array puro
        applyList(pm as HeroMetric[]);
        isLoaded.value = true;
      } else if (pm && typeof pm === 'object') {
        // Legacy format: object with named keys
        Object.entries(pm as Record<string, unknown>).forEach(([, v], i) => {
          if (heroMetrics[i] && typeof v === 'object' && v !== null) {
            const metric = v as Partial<HeroMetric>;
            if (metric.value) heroMetrics[i].value = metric.value;
            if (metric.label) heroMetrics[i].label = metric.label;
          }
        });
        isLoaded.value = true;
      }
    } catch { /* keep defaults */ }
  }

  /** Save metrics via admin endpoint — only call from admin context */
  async function saveMetrics() {
    await adminService.updatePresentationMetrics(heroMetrics);
    isLoaded.value = false; // force reload on next load
  }

  return { heroMetrics, isLoaded, updateMetric, loadMetrics, saveMetrics };
});
