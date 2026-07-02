/** Formatação pt-BR no padrão exato do deck (manifesto). */

export const MINUS = '−'; // U+2212, usado no deck

export function brNum(n: number, dec = 1): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

/** 67879000 → "R$ 67,9 Mi" (spaced) ou "R$67,9Mi" (compacto). */
export function fmtMi(v: number, spaced = true, dec = 1): string {
  const mi = v / 1e6;
  return spaced ? `R$ ${brNum(mi, dec)} Mi` : `R$${brNum(mi, dec)}Mi`;
}

/** 473320 → "473,3k" (dec=1) ou "473k" (dec=0). */
export function fmtK(v: number, dec = 1): string {
  return brNum(v / 1000, dec) + 'k';
}

/** 584348 → "584.348" */
export function fmtInt(v: number): string {
  return Math.round(v).toLocaleString('pt-BR');
}

/** variação percentual com sinal do deck: +12,4% / −17,8% */
export function fmtVarPct(pct: number, dec = 1): string {
  const s = brNum(Math.abs(pct), dec) + '%';
  return (pct >= 0 ? '+' : MINUS) + s;
}

/** seta ▲/▼ + percentual: "▲ 16,0%" / "▼ 3,2%" */
export function setaPct(pct: number, dec = 1): string {
  return (pct >= 0 ? '▲ ' : '▼ ') + brNum(Math.abs(pct), dec) + '%';
}

/** variação em R$ Mi com sinal: +R$2,74Mi / −R$5,28Mi */
export function fmtVarMi(v: number, dec = 2): string {
  return (v >= 0 ? '+' : MINUS) + `R$${brNum(Math.abs(v) / 1e6, dec)}Mi`;
}

/** variação em kTON com sinal: +54,0k / −15,4k */
export function fmtVarK(v: number, dec = 1): string {
  return (v >= 0 ? '+' : MINUS) + brNum(Math.abs(v) / 1000, dec) + 'k';
}

export function pctInt(v: number): number {
  return Math.round(v);
}

/** Regra de Ouro 6: "Louis Dreyfus" → sempre LDC (+ limpeza de sufixos de cidade). */
export function normCliente(nome: string): string {
  let n = String(nome ?? '').trim();
  if (/louis\s*dreyfus/i.test(n) || /^ldc\b/i.test(n)) return 'LDC';
  // remove sufixos tipo " - PGUA-PR" que às vezes escapam do grupo
  n = n.replace(/\s*-\s*[A-ZÀ-Ú.]{2,}[A-ZÀ-Ú\- .]*$/u, '').trim() || String(nome).trim();
  return n.toUpperCase();
}

/** Normaliza nome de grupo de produtos (acentos/typos comuns do Excel). */
export function normGrupo(g: string): string {
  const s = String(g ?? '').trim().toLowerCase();
  if (s.startsWith('soda')) return 'Soda Cáustica';
  if (s.startsWith('bio')) return 'Biocombustíveis';
  if (s.startsWith('deriv')) return 'Derivados';
  if (s.startsWith('metanol') || s === 'methanol') return 'Metanol';
  if (s.startsWith('aquec')) return 'Aquecidos';
  if (s.includes('vegetal')) return 'Óleo Vegetal';
  if (s.startsWith('acostag')) return 'Acostagem';
  if (s.startsWith('outro')) return 'Outros';
  return String(g ?? '').trim();
}

/** Cores fixas por grupo (Regra de Ouro 4) — usar SEMPRE. */
export const COR_GRUPO: Record<string, string> = {
  'Metanol': '#00B050',
  'Derivados': '#14204A',
  'Aquecidos': '#8A9BB0',
  'Óleo Vegetal': '#F5C400',
  'Soda Cáustica': '#C8D4DF',
  'Biocombustíveis': '#F0A33A',
  'Outros': '#5A82B5',
};

/** Cores fixas por terminal (Regra de Ouro 5). */
export const COR_TERMINAL: Record<string, { color: string; textColor: string }> = {
  'Cattalini': { color: '#10253F', textColor: '#ffffff' },
  'Transpetro': { color: '#6C809A', textColor: '#ffffff' },
  'CBL': { color: '#FFC000', textColor: '#7a5500' },
  'Terin': { color: '#9BBB59', textColor: '#3a5a10' },
};

/** Normaliza nome de terminal do Excel. */
export function normTerminal(t: string): string {
  const s = String(t ?? '').trim().toLowerCase();
  if (s.startsWith('cattalini')) return 'Cattalini';
  if (s.startsWith('transpetro')) return 'Transpetro';
  if (s.startsWith('cbl')) return 'CBL';
  if (s.startsWith('terin')) return 'Terin';
  if (s.startsWith('vopak')) return 'Vopak';
  if (s.startsWith('liquipar')) return 'Liquipar';
  if (s.includes('lcool')) return 'Alcool';
  return String(t ?? '').trim();
}

/** rótulo curto de grupo para donut/pareto ("Biocombustíveis" → "Biocombust."). */
export function grupoCurto(g: string): string {
  return g === 'Biocombustíveis' ? 'Biocombust.' : g;
}

const MESES_LABEL = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function refLabel(mesN: number, ano: number): string {
  return `${MESES_LABEL[mesN - 1]}/${String(ano).slice(2)}`;
}

export function mesNome(mesN: number): string {
  return MESES_NOME[mesN - 1];
}

export function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Janela de 13 meses rolantes terminando em (mesN, ano). */
export interface Janela {
  meses: { mesN: number; ano: number; label: string }[];
  labels: string[];
  navCorrente: string[];
  janelaLabel: string;
}

export function janela13(mesN: number, ano: number): Janela {
  const meses: Janela['meses'] = [];
  let m = mesN;
  let a = ano;
  for (let i = 0; i < 13; i++) {
    meses.unshift({ mesN: m, ano: a, label: refLabel(m, a) });
    m--;
    if (m === 0) { m = 12; a--; }
  }
  const labels = meses.map((x) => x.label);
  const navCorrente = meses.filter((x) => x.ano === ano).map((x) => x.label);
  const first = meses[0];
  const janelaLabel = `${capitalizar(MESES_LABEL[first.mesN - 1])}/${first.ano} → ${capitalizar(MESES_LABEL[mesN - 1])}/${ano}`;
  return { meses, labels, navCorrente, janelaLabel };
}
