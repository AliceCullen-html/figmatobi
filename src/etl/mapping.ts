/**
 * Assistente de Mapeamento (seção 6 do prompt).
 * Não assume nomes de abas/colunas: auto-detecta por heurística e deixa
 * o usuário confirmar/corrigir. O mapa é salvo como mapping.config.json.
 */
import type { SheetData, DatasetKey, DatasetMapping, MappingConfig } from './types';
import { DATASET_FIELDS } from './types';

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9$()]+/g, ' ').trim();
}

/** score de similaridade simples entre header e dica. */
function headerScore(header: string, hint: string): number {
  const h = norm(header);
  const d = norm(hint);
  if (!h || !d) return 0;
  if (h === d) return 3;
  if (h.includes(d) || d.includes(h)) return 2;
  const hw = new Set(h.split(' '));
  const dw = d.split(' ');
  const common = dw.filter((w) => hw.has(w)).length;
  return common >= Math.max(1, dw.length - 1) ? 1 : 0;
}

/** Melhor coluna de uma aba para um campo lógico. */
function bestColumn(headers: string[], hints: string[]): { col: string; score: number } {
  let best = { col: '', score: 0 };
  for (const h of headers) {
    for (let i = 0; i < hints.length; i++) {
      // dicas mais à frente têm prioridade levemente maior
      const s = headerScore(h, hints[i]) * 10 - i;
      if (s > best.score) best = { col: h, score: s };
    }
  }
  return best;
}

/** Auto-detecta a melhor aba (e colunas) para um dataset. */
export function detectDataset(sheets: SheetData[], key: DatasetKey): DatasetMapping | null {
  const fields = DATASET_FIELDS[key];
  let best: { m: DatasetMapping; score: number } | null = null;
  for (const sh of sheets) {
    if (sh.rows.length < 5) continue;
    const columns: Record<string, string> = {};
    let score = 0;
    let requiredOk = true;
    for (const f of fields) {
      const b = bestColumn(sh.headers, f.hints);
      if (b.score > 0) {
        columns[f.field] = b.col;
        score += b.score;
      } else if (f.required) {
        requiredOk = false;
      }
    }
    if (!requiredOk) continue;
    // bônus por volume de dados (fato > resumo)
    score += Math.min(10, Math.log10(sh.rows.length + 1) * 2);
    if (!best || score > best.score) {
      best = { m: { file: sh.file, sheet: sh.sheet, columns }, score };
    }
  }
  return best ? best.m : null;
}

/** Auto-detecta todos os datasets a partir das abas carregadas. */
export function autoDetect(sheets: SheetData[]): MappingConfig {
  const datasets: MappingConfig['datasets'] = {};
  const keys: DatasetKey[] = ['fat_realizado', 'fat_orcado', 'mov_terminal', 'mov_cliente', 'mov_orcada', 'previsao_mov'];
  const ehOrcamento = (s: SheetData) => /or[cç]amento|or[cç]ado/i.test(s.file);
  // heurísticas de desempate por nome de aba/arquivo (orçado prioriza o ARQUIVO de orçamento)
  const prefer: Record<DatasetKey, (s: SheetData) => boolean> = {
    fat_realizado: (s) => /banco de dados - faturamento/i.test(s.sheet) && !ehOrcamento(s),
    fat_orcado: (s) => ehOrcamento(s) && /banco de dados|fat/i.test(s.sheet) && !/mov/i.test(s.sheet),
    mov_terminal: (s) => /mov - realizada$/i.test(s.sheet) || /terminal/i.test(s.sheet),
    mov_cliente: (s) => /mov - realizada\(cliente\)/i.test(s.sheet) || (/cliente/i.test(s.sheet) && /mov/i.test(s.sheet)),
    mov_orcada: (s) => /mov - or[cç]ada/i.test(s.sheet) || (ehOrcamento(s) && /mov/i.test(s.sheet)),
    previsao_mov: (s) => /proje[cç][aã]o - ton/i.test(s.sheet) || /previs[aã]o/i.test(s.sheet),
  };
  const claimed = new Set<string>();
  for (const key of keys) {
    // 1º tenta abas com nome preferido (excluindo abas já atribuídas a outro dataset)
    const livres = sheets.filter((s) => !claimed.has(`${s.file}::${s.sheet}`));
    const preferred = livres.filter((s) => prefer[key](s));
    const m = detectDataset(preferred.length ? preferred : livres, key) ?? detectDataset(livres, key);
    if (m) {
      datasets[key] = m;
      claimed.add(`${m.file}::${m.sheet}`);
    }
  }
  return { version: 1, criadoEm: '', datasets };
}

/** Verifica se um mapping salvo é compatível com as abas carregadas. */
export function mappingCompativel(cfg: MappingConfig, sheets: SheetData[]): boolean {
  for (const m of Object.values(cfg.datasets)) {
    if (!m) continue;
    const sh = sheets.find((s) => s.sheet === m.sheet);
    if (!sh) return false;
    for (const col of Object.values(m.columns)) {
      if (!sh.headers.includes(col)) return false;
    }
  }
  return Object.keys(cfg.datasets).length > 0;
}
