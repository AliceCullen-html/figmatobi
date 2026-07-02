/** Estado do app + persistência (localStorage e .json de projeto). */
import type { MappingConfig, Pendencia, ValidationIssue } from '../etl/types';

export interface ProjetoState {
  mapping: MappingConfig | null;
  /** overrides por chave do manifesto (patch profundo aplicado sobre o ETL) */
  overrides: Record<string, unknown>;
  /** pendências marcadas como resolvidas / "sem alteração este mês" */
  pendResolvidas: string[];
  /** HTML editado à mão por slide (lápis ✏️) — vence sobre o gerado */
  htmlEdits: Record<string, string>;
}

const LS_KEY = 'reportbi.projeto.v1';

export function loadProjeto(): ProjetoState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { mapping: null, overrides: {}, pendResolvidas: [], htmlEdits: {}, ...JSON.parse(raw) };
  } catch { /* estado corrompido → recomeça */ }
  return { mapping: null, overrides: {}, pendResolvidas: [], htmlEdits: {} };
}

export function saveProjeto(p: ProjetoState): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch { /* quota — ignora */ }
}

/** merge profundo: override sobrepõe o manifesto do ETL. */
export function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined) return base;
  if (Array.isArray(patch) || typeof patch !== 'object' || patch === null ||
      typeof base !== 'object' || base === null || Array.isArray(base)) {
    return patch as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    out[k] = deepMerge(out[k], v);
  }
  return out as T;
}

export function aplicarOverrides(manifesto: Record<string, any>, overrides: Record<string, unknown>): Record<string, any> {
  return deepMerge(manifesto, overrides);
}

export function statusSlide(nn: string, pend: Pendencia[], valid: ValidationIssue[], resolvidas: string[]): 'ok' | 'warn' | 'block' {
  const p = pend.filter((x) => x.slide === nn && !resolvidas.includes(x.id));
  const v = valid.filter((x) => x.slide === nn);
  if (p.some((x) => x.severidade === 'block') || v.some((x) => x.severidade === 'error')) return 'block';
  if (p.length || v.length) return 'warn';
  return 'ok';
}

export function download(nome: string, conteudo: Blob | string, mime = 'application/octet-stream'): void {
  const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** chave do manifesto correspondente a cada slide (para o editor de overrides). */
export const SLIDE_KEY: Record<string, string> = {
  '01': 'slide01_destaques', '02': 'slide02_faturamento', '03': 'slide03_carteira_fat',
  '04': 'slide04_carteira_mov', '05': 'slide05_abc_produto', '06': 'slide06_abc_cliente',
  '07': 'slide07_receita_servico', '08': 'slide08_espaco_m3', '09': 'slide09_mov_acumulado',
  '10': 'slide10_mov_maio', '11': 'slide11_previsao', '12': 'slide12_market_share',
  '13': 'slide13_ms_derivados', '14': 'slide14_soda', '15': 'slide15_oleo_degomado',
  '16': 'slide16_transpetro', '18': 'slide18_top_meses',
};
