/** Parser de Excel no browser via SheetJS. */
import * as XLSX from 'xlsx';
import type { SheetData } from './types';

/** Lê um ArrayBuffer de .xlsx e devolve todas as abas como objetos. */
export function parseWorkbook(fileName: string, buf: ArrayBuffer): SheetData[] {
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

export function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
