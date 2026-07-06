/** Parser de Excel no browser via SheetJS (carregado sob demanda). */
import type { SheetData } from './types';

/** Lê um ArrayBuffer de .xlsx e devolve todas as abas como objetos.
 * O SheetJS (xlsx) é a maior lib do app — carregado sob demanda (lazy). */
export async function parseWorkbook(fileName: string, buf: ArrayBuffer): Promise<SheetData[]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'array', dense: true });
  const out: SheetData[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws || !ws['!ref']) {
      out.push({ file: fileName, sheet: name, rows: [], headers: [] });
      continue;
    }
    const matrix: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
    // primeira linha com >=2 células preenchidas vira header
    let hi = 0;
    while (hi < matrix.length && (matrix[hi] ?? []).filter((c) => c !== null && c !== '').length < 2) hi++;
    if (hi >= matrix.length) {
      out.push({ file: fileName, sheet: name, rows: [], headers: [] });
      continue;
    }
    const headers = (matrix[hi] as unknown[]).map((h, i) => (h === null || h === '' ? `__col${i}` : String(h).trim()));
    const rows: Record<string, unknown>[] = [];
    for (let r = hi + 1; r < matrix.length; r++) {
      const line = matrix[r] ?? [];
      if (line.every((c) => c === null || c === '')) continue;
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => { obj[h] = line[i] ?? null; });
      rows.push(obj);
    }
    out.push({ file: fileName, sheet: name, rows, headers });
  }
  return out;
}

const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Normaliza mês PT ("Janeiro", "janeiro", 1, "jan") → 1..12 (0 = inválido). */
export function mesNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v >= 1 && v <= 12 ? Math.trunc(v) : 0;
  const s = String(v).trim().toLowerCase();
  const n = Number(s);
  if (Number.isFinite(n) && n >= 1 && n <= 12) return Math.trunc(n);
  const i = MESES_PT.findIndex((m) => m === s || m.startsWith(s.slice(0, 3)));
  return i >= 0 ? i + 1 : 0;
}

export function mesAbrev(n: number): string {
  return MESES_ABREV[n - 1] ?? '';
}

export function mesNomePt(n: number): string {
  return MESES_PT[n - 1] ?? '';
}

export function anoNum(v: unknown): number {
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) && n >= 2000 && n <= 2100 ? Math.trunc(n) : 0;
}

/**
 * Converte exports JSON do Power BI (resumo-bi*.json) em "abas" sintéticas,
 * para entrarem no mesmo fluxo de mapeamento/ETL do Excel.
 * Estrutura esperada: results[0].tables[0].rows[].
 */
export function parseBiJson(fileName: string, jsonText: string): SheetData[] {
  const data = JSON.parse(jsonText.replace(/^﻿/, ''));
  const rows: Record<string, unknown>[] = data?.results?.[0]?.tables?.[0]?.rows;
  if (!Array.isArray(rows) || !rows.length) return [];
  const keys = new Set<string>();
  for (const r of rows.slice(0, 50)) Object.keys(r).forEach((k) => keys.add(k));
  const out: SheetData[] = [];
  const g = (r: Record<string, unknown>, k: string) => r[k] ?? null;

  if (keys.has('[Mov Cattalini]')) {
    // resumo-bi.json → formato longo: uma linha por terminal×mês
    const TERMS = ['Cattalini', 'CBL', 'Terin', 'Transpetro', 'Vopak', 'Alcool'];
    const flat: Record<string, unknown>[] = [];
    for (const r of rows) {
      if (!g(r, 'dCalendario[ANO]')) continue; // linha suja {"[Mov Orcada]":0}
      for (const t of TERMS) {
        flat.push({
          'TERMINAL': t,
          'ANO': g(r, 'dCalendario[ANO]'),
          'MêsNum': g(r, 'dCalendario[MêsNum]'),
          'MÊS': g(r, 'dCalendario[Mês]'),
          'GRUPO DE PRODUTOS': null, // o JSON do BI não abre por grupo
          'Mov (TON)': g(r, `[Mov ${t}]`),
          'Share': g(r, `[Share ${t}]`),
        });
      }
    }
    out.push({ file: fileName, sheet: 'BI · Terminais (mensal)', rows: flat, headers: ['TERMINAL', 'ANO', 'MêsNum', 'MÊS', 'GRUPO DE PRODUTOS', 'Mov (TON)', 'Share'] });
  } else if (keys.has('[M3 Faturado]') || keys.has('[Mov Realizada]')) {
    // resumo-bi-produtos.json
    const flat = rows.filter((r) => g(r, 'dCalendario[ANO]')).map((r) => ({
      'ANO': g(r, 'dCalendario[ANO]'),
      'MêsNum': g(r, 'dCalendario[MêsNum]'),
      'MÊS': g(r, 'dCalendario[Mês]'),
      'GRUPO DE PRODUTOS': g(r, 'Realizado_Faturamento[GRUPO DE PRODUTOS]'),
      'Fat Realizado': g(r, '[Fat Realizado]'),
      'Fat Orcado': g(r, '[Fat Orcado]'),
      'Mov Realizada': g(r, '[Mov Realizada]'),
      'Mov Orcada': g(r, '[Mov Orcada]'),
      'TON Faturado': g(r, '[TON Faturado]'),
      'M3 Faturado': g(r, '[M3 Faturado]'),
    }));
    out.push({ file: fileName, sheet: 'BI · Produtos (mensal)', rows: flat, headers: Object.keys(flat[0] ?? {}) });
  } else if (keys.has('Mov - Realizada(Cliente)[Grupo]')) {
    const flat = rows.map((r) => ({
      'Cliente': g(r, 'Mov - Realizada(Cliente)[Grupo]'),
      'GRUPO2': g(r, 'Mov - Realizada(Cliente)[GRUPO2]'),
      'ANO': g(r, 'dCalendario[ANO]'),
      'Mov_Realizada_TON': g(r, '[Mov_Realizada_TON]'),
    }));
    out.push({ file: fileName, sheet: 'BI · Clientes Mov (anual)', rows: flat, headers: Object.keys(flat[0] ?? {}) });
  } else if (keys.has('Realizado_Faturamento[Grupo de Cliente ]') && keys.has('[Fat_Realizado]')) {
    const flat = rows.map((r) => ({
      'Cliente': g(r, 'Realizado_Faturamento[Grupo de Cliente ]'),
      'ANO': g(r, 'dCalendario[ANO]'),
      'Fat_Realizado': g(r, '[Fat_Realizado]'),
      // ⚠️ [Fat_Orcado] por cliente é QUEBRADO (repete o total) — não expor
    }));
    out.push({ file: fileName, sheet: 'BI · Clientes Fat (anual)', rows: flat, headers: Object.keys(flat[0] ?? {}) });
  } else {
    // genérico (ex.: resumo-bi-ytd.json) — vira aba informativa
    out.push({ file: fileName, sheet: `BI · ${fileName.split('/').pop()?.replace('.json', '')}`, rows, headers: [...keys] });
  }
  return out;
}

export function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
