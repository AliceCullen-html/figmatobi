/**
 * ETL: Excel mapeado → manifesto (mesma estrutura de references/dados_mes.json).
 * Regras de negócio da skill: ABC, YTD recalculado somando meses, janela 13m,
 * LDC, cores fixas, Acostagem fora do pareto, MS Derivados sem Transpetro.
 * Campos que o Excel não entrega com confiança viram PENDÊNCIA (nunca valor cru).
 */
import type { SheetData, MappingConfig, DatasetKey, Pendencia, ValidationIssue } from './types';
import { mesNum, anoNum, num } from './excel';
import {
  MINUS, fmtMi, fmtK, fmtInt, fmtVarPct, setaPct, fmtVarMi, fmtVarK, brNum,
  normCliente, normGrupo, normTerminal, COR_GRUPO, COR_TERMINAL, grupoCurto,
  refLabel, mesNome, capitalizar, janela13,
} from './format';

export interface EtlResult {
  manifesto: Record<string, any>;
  pendencias: Pendencia[];
  validacoes: ValidationIssue[];
}

interface FatRow { ano: number; mesN: number; cliente: string; grupo: string; servico: string; servicoRaw: string; produto: string; ton: number; m3: number; valor: number; contrato: string }
interface MovTRow { terminal: string; ano: number; mesN: number; produto: string; grupo: string; ton: number }
interface MovCRow { cliente: string; produto: string; grupo: string; ton: number; mesN: number; ano: number }
interface SimplesRow { ano: number; mesN: number; grupo: string; ton: number; cliente?: string }

const GRUPOS_ORDEM = ['Metanol', 'Derivados', 'Aquecidos', 'Óleo Vegetal', 'Soda Cáustica', 'Biocombustíveis', 'Outros'];
// chaves do chart group_stacked/trio de gerar.py
const GKEY: Record<string, string> = {
  'Metanol': 'met', 'Derivados': 'der', 'Aquecidos': 'aq', 'Óleo Vegetal': 'ov',
  'Soda Cáustica': 'sc', 'Biocombustíveis': 'bio', 'Outros': 'out',
};
// densidades usadas historicamente no deck para converter TON→m³ (Transpetro)
const DENS: Record<string, number> = { die: 0.84, bun: 0.98, glp: 0.55, gas: 0.74, naf: 0.70 };

function getRows(sheets: SheetData[], cfg: MappingConfig, key: DatasetKey): Record<string, unknown>[] | null {
  const m = cfg.datasets[key];
  if (!m) return null;
  const sh = sheets.find((s) => s.sheet === m.sheet && (!m.file || s.file === m.file)) ?? sheets.find((s) => s.sheet === m.sheet);
  if (!sh) return null;
  return sh.rows;
}

function col(m: MappingConfig, key: DatasetKey, field: string): string {
  return m.datasets[key]?.columns[field] ?? '';
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
function somaPor<T>(rows: T[], keyFn: (r: T) => string, valFn: (r: T) => number): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = keyFn(r);
    m.set(k, (m.get(k) ?? 0) + valFn(r));
  }
  return m;
}

export function buildManifest(sheets: SheetData[], cfg: MappingConfig): EtlResult {
  const pend: Pendencia[] = [];
  const valid: ValidationIssue[] = [];
  const addPend = (slide: string, campo: string, rotulo: string, severidade: 'warn' | 'block' = 'warn') =>
    pend.push({ id: `${slide}:${campo}`, slide, campo, rotulo, severidade, resolvida: false });

  // ---------- normalização dos datasets ----------
  const rawFat = getRows(sheets, cfg, 'fat_realizado');
  if (!rawFat) throw new Error('Dataset "Faturamento Realizado" não mapeado — confira o mapeamento.');
  const c = (f: string) => col(cfg, 'fat_realizado', f);
  const fat: FatRow[] = rawFat.map((r) => ({
    ano: anoNum(r[c('ano')]),
    mesN: mesNum(r[c('mes')]),
    cliente: normCliente(String(r[c('cliente')] ?? '')),
    grupo: normGrupo(String(r[c('grupo')] ?? '')),
    servico: String(r[c('servico')] ?? '').trim(),
    servicoRaw: String(r[c('servico_raw')] ?? '').trim(),
    produto: String(r[c('produto')] ?? '').trim(),
    ton: num(r[c('ton')]),
    m3: num(r[c('m3')]),
    valor: num(r[c('valor')]),
    contrato: String(r[c('contrato')] ?? '').trim(),
  })).filter((r) => r.ano > 0 && r.mesN > 0);

  const co = (f: string) => col(cfg, 'fat_orcado', f);
  const rawOrc = getRows(sheets, cfg, 'fat_orcado');
  const fatOrc: SimplesRow[] = (rawOrc ?? []).map((r) => ({
    ano: anoNum(r[co('ano')]),
    mesN: mesNum(r[co('mes')]),
    grupo: normGrupo(String(r[co('grupo')] ?? '')),
    cliente: normCliente(String(r[co('cliente')] ?? '')),
    ton: num(r[co('valor')]),
  })).filter((r) => r.ano > 0 && r.mesN > 0);

  const ct = (f: string) => col(cfg, 'mov_terminal', f);
  const rawMovT = getRows(sheets, cfg, 'mov_terminal');
  const movT: MovTRow[] = (rawMovT ?? []).map((r) => ({
    terminal: normTerminal(String(r[ct('terminal')] ?? '')),
    ano: anoNum(r[ct('ano')]),
    mesN: mesNum(r[ct('mes')]),
    produto: String(r[ct('produto')] ?? '').trim(),
    grupo: normGrupo(String(r[ct('grupo')] ?? '')),
    ton: num(r[ct('ton')]),
  })).filter((r) => r.ano > 0 && r.mesN > 0);

  const cc = (f: string) => col(cfg, 'mov_cliente', f);
  const rawMovC = getRows(sheets, cfg, 'mov_cliente');
  const movC: MovCRow[] = (rawMovC ?? []).map((r) => ({
    cliente: normCliente(String(r[cc('cliente')] ?? '')),
    produto: String(r[cc('produto')] ?? '').trim(),
    grupo: normGrupo(String(r[cc('grupo')] ?? '')),
    ton: num(r[cc('ton')]),
    mesN: mesNum(r[cc('mesnum')]),
    ano: anoNum(r[cc('ano')]),
  })).filter((r) => r.ano > 0 && r.mesN > 0);

  const cm = (f: string) => col(cfg, 'mov_orcada', f);
  const rawMovO = getRows(sheets, cfg, 'mov_orcada');
  const movOrc: SimplesRow[] = (rawMovO ?? []).map((r) => ({
    ano: anoNum(r[cm('ano')]),
    mesN: mesNum(r[cm('mes')]),
    grupo: normGrupo(String(r[cm('grupo')] ?? '')),
    ton: num(r[cm('ton')]),
  })).filter((r) => r.ano > 0 && r.mesN > 0);

  const cp = (f: string) => col(cfg, 'previsao_mov', f);
  const rawPrev = getRows(sheets, cfg, 'previsao_mov');
  // produto → grupo (moda) para agrupar a previsão
  const prodGrupo = new Map<string, string>();
  {
    const cont = new Map<string, Map<string, number>>();
    for (const r of fat) {
      const p = r.produto.toUpperCase();
      if (!p) continue;
      if (!cont.has(p)) cont.set(p, new Map());
      const g = cont.get(p)!;
      g.set(r.grupo, (g.get(r.grupo) ?? 0) + 1);
    }
    for (const [p, g] of cont) {
      prodGrupo.set(p, [...g.entries()].sort((a, b) => b[1] - a[1])[0][0]);
    }
  }
  const prevMov: SimplesRow[] = (rawPrev ?? []).map((r) => ({
    ano: anoNum(r[cp('ano')]),
    mesN: mesNum(r[cp('mes')]),
    grupo: prodGrupo.get(String(r[cp('produto')] ?? '').trim().toUpperCase()) ?? 'Outros',
    ton: num(r[cp('valor')]),
  })).filter((r) => r.ano > 0 && r.mesN > 0);

  // ---------- mês de referência = último mês com faturamento realizado ----------
  let refAno = 0; let refMes = 0;
  for (const r of fat) {
    if (r.ano > refAno || (r.ano === refAno && r.mesN > refMes)) { refAno = r.ano; refMes = r.mesN; }
  }
  if (!refAno) throw new Error('Nenhum mês com faturamento realizado encontrado no Excel.');
  const jan = janela13(refMes, refAno);
  const ref = refLabel(refMes, refAno);
  const mesNomeRef = mesNome(refMes);
  const anoAnt = refAno - 1;

  // ---------- agregações base ----------
  const fatMes = fat.filter((r) => r.ano === refAno && r.mesN === refMes);
  const fatMesAA = fat.filter((r) => r.ano === anoAnt && r.mesN === refMes);
  const fatYtd = fat.filter((r) => r.ano === refAno && r.mesN <= refMes);
  const fatYtdAA = fat.filter((r) => r.ano === anoAnt && r.mesN <= refMes);
  const fatRealMes = sum(fatMes.map((r) => r.valor));
  const fatMesAAv = sum(fatMesAA.map((r) => r.valor));
  const fatYtdV = sum(fatYtd.map((r) => r.valor));
  const fatYtdAAv = sum(fatYtdAA.map((r) => r.valor));

  const orcMes = fatOrc.filter((r) => r.ano === refAno && r.mesN === refMes);
  const fatOrcMes = sum(orcMes.map((r) => r.ton));
  if (!rawOrc || fatOrcMes <= 0) {
    addPend('02', 'slide02_faturamento', 'Fat Orçado por grupo — subir o Excel de orçamento ou informar via override (aba Curva ABC / print).', 'block');
  }

  const movCat = movT.filter((r) => r.terminal === 'Cattalini');
  const movCatMes = sum(movCat.filter((r) => r.ano === refAno && r.mesN === refMes).map((r) => r.ton));
  const movCatMesAA = sum(movCat.filter((r) => r.ano === anoAnt && r.mesN === refMes).map((r) => r.ton));
  const movCatYtd = sum(movCat.filter((r) => r.ano === refAno && r.mesN <= refMes).map((r) => r.ton));
  const movCatYtdAA = sum(movCat.filter((r) => r.ano === anoAnt && r.mesN <= refMes).map((r) => r.ton));
  const movOrcMes = sum(movOrc.filter((r) => r.ano === refAno && r.mesN === refMes).map((r) => r.ton));
  const movOrcYtd = sum(movOrc.filter((r) => r.ano === refAno && r.mesN <= refMes).map((r) => r.ton));
  if (!rawMovT) addPend('12', 'slide12_market_share', 'Movimentação por terminal não mapeada — market share exige a aba "Mov - Realizada" (ou print MARKETSHARE).', 'block');
  if (rawMovT && movT.length && !movT.some((r) => r.grupo && r.grupo !== 'null')) {
    // fonte sem abertura por grupo (ex.: resumo-bi.json) — só o share geral é confiável
    addPend('13', 'slide13_ms_derivados', 'A fonte de terminais não abre por grupo de produto — MS Derivados exige a aba "Mov - Realizada" do Excel ou print.', 'block');
    addPend('14', 'slide14_soda', 'A fonte de terminais não abre por grupo — volumes de Soda Cáustica exigem a aba "Mov - Realizada" ou print.', 'block');
    addPend('16', 'slide16_transpetro', 'A fonte de terminais não abre por produto — Transpetro por produto exige a aba "Mov - Realizada" ou print.', 'block');
  }

  // m³ faturado por mês (para slide 08 e tickets)
  // IMPORTANTE: o mesmo espaço aparece em várias linhas de serviço (Seguro, SOP,
  // N2, Acostagem, 2º Giro…) — somar tudo dobra o m³. Espaço físico = só os
  // serviços de armazenagem/embarque (validado contra o BI: mai/26 846k vs 845k).
  const SERV_ESPACO = /^(ARMAZENAGEM|ARMAZ ?EXCEDENTE|EXCEDENTE ?1)$|EMBARQUE/i;
  const fatEspaco = fat.filter((r) =>
    r.servicoRaw ? SERV_ESPACO.test(r.servicoRaw) : !!r.contrato);
  const m3PorMes = somaPor(fatEspaco, (r) => `${r.ano}-${r.mesN}`, (r) => r.m3);
  const m3Ytd = sum(jan.meses.filter((m) => m.ano === refAno).map((m) => m3PorMes.get(`${m.ano}-${m.mesN}`) ?? 0));
  const mesesYtdN = jan.meses.filter((m) => m.ano === refAno).length;

  // contratos / serviços (YTD)
  const topFatYtd = sum(fatYtd.filter((r) => /take or pay/i.test(r.servico)).map((r) => r.valor));
  const c12FatYtd = sum(fatYtd.filter((r) => /> ?12/i.test(r.contrato)).map((r) => r.valor));

  const pctSafe = (a: number, b: number) => (b !== 0 ? (a / b - 1) * 100 : 0);
  const fatAAPct = pctSafe(fatRealMes, fatMesAAv);
  const fatYtdAAPct = pctSafe(fatYtdV, fatYtdAAv);
  const movAAPct = pctSafe(movCatMes, movCatMesAA);
  const movYtdAAPct = pctSafe(movCatYtd, movCatYtdAA);
  const atingPct = fatOrcMes ? (fatRealMes / fatOrcMes) * 100 : 0;
  const movAtingPct = movOrcMes ? (movCatMes / movOrcMes) * 100 : 0;

  const D: Record<string, any> = {};
  D['meta'] = {
    mes: mesNomeRef,
    mes_num: refMes,
    ano: refAno,
    ref,
    janela_label: jan.janelaLabel,
    nav_corrente: jan.navCorrente,
  };
  D['kpis_gerais'] = {
    fat_real_mi: Math.round(fatRealMes / 1e5) / 10,
    fat_orcado_mi: Math.round(fatOrcMes / 1e5) / 10,
    ating_pct: Math.round(atingPct * 10) / 10,
    fat_aa_pct: Math.round(fatAAPct * 10) / 10,
    fat_ytd_mi: Math.round(fatYtdV / 1e4) / 100,
    fat_ytd_aa_pct: Math.round(fatYtdAAPct * 10) / 10,
    mov_real_ton: Math.round(movCatMes),
    mov_aa_pct: Math.round(movAAPct * 10) / 10,
    mov_orcado_ton: Math.round(movOrcMes),
    mov_ating_pct: Math.round(movAtingPct * 10) / 10,
    mov_ytd_ton: Math.round(movCatYtd),
    mov_ytd_aa_pct: Math.round(movYtdAAPct * 10) / 10,
    ticket_ton: movCatYtd ? Math.round((fatYtdV / movCatYtd) * 100) / 100 : 0,
    ticket_m3: m3Ytd ? Math.round((fatYtdV / m3Ytd) * 100) / 100 : 0,
    contratos_12m_pct: fatYtdV ? Math.round((c12FatYtd / fatYtdV) * 100) : 0,
    take_or_pay_pct: fatYtdV ? Math.round((topFatYtd / fatYtdV) * 100) : 0,
    espaco_ytd_m3: mesesYtdN ? Math.round(m3Ytd / mesesYtdN) : 0,
    espaco_12m_med_m3: Math.round(sum(jan.meses.slice(1).map((m) => m3PorMes.get(`${m.ano}-${m.mesN}`) ?? 0)) / 12),
  };

  // ---------- faturamento por grupo (mês) ----------
  const fatGrupoMes = somaPor(fatMes.filter((r) => r.grupo !== 'Acostagem'), (r) => r.grupo, (r) => r.valor);
  const gruposDesc = [...fatGrupoMes.entries()].sort((a, b) => b[1] - a[1]);
  D['produtos_fat_mai_mi'] = Object.fromEntries(gruposDesc.map(([g, v]) => [g, Math.round(v / 1e5) / 10]));

  const fatGrupoMesAA = somaPor(fatMesAA, (r) => r.grupo, (r) => r.valor);
  const orcGrupoMes = somaPor(orcMes, (r) => r.grupo!, (r) => r.ton);
  const movGrupoMes = somaPor(movCat.filter((r) => r.ano === refAno && r.mesN === refMes), (r) => r.grupo, (r) => r.ton);
  const movOrcGrupoMes = somaPor(movOrc.filter((r) => r.ano === refAno && r.mesN === refMes), (r) => r.grupo, (r) => r.ton);

  // classes ABC por acumulado de faturamento (A ≤70%, B ≤90%)
  const abcGrupo = new Map<string, string>();
  {
    let cum = 0;
    for (const [g, v] of gruposDesc) {
      cum += fatGrupoMes.size ? (v / fatRealMes) * 100 : 0;
      abcGrupo.set(g, cum <= 70 ? 'A' : cum <= 90 ? 'B' : 'C');
    }
  }

  // ---------- SLIDE 02 ----------
  {
    const rows = gruposDesc.map(([g, v]) => {
      const fo = orcGrupoMes.get(g) ?? 0;
      const vf = v - fo;
      const tr = movGrupoMes.get(g) ?? 0;
      const to = movOrcGrupoMes.get(g) ?? 0;
      const vm = tr - to;
      return [
        g, abcGrupo.get(g) ?? 'C',
        fmtMi(v, false), fmtMi(fo, false), fmtVarMi(vf), vf >= 0 ? 'up' : 'down',
        fmtK(tr), fmtK(to), fmtVarK(vm), vm >= 0 ? 'up' : 'down',
      ];
    });
    const movOrcTotal = sum([...movOrcGrupoMes.values()]);
    const total = [
      fmtMi(fatRealMes, false), fmtMi(fatOrcMes, false), fmtVarMi(fatRealMes - fatOrcMes, 1),
      fatRealMes - fatOrcMes >= 0 ? 'up' : 'down',
      fmtK(movCatMes), fmtK(movOrcTotal), fmtVarK(movCatMes - movOrcTotal),
      movCatMes - movOrcTotal >= 0 ? 'up' : 'down',
    ];
    const varOrcG = gruposDesc.map(([g, v]) => [g, v - (orcGrupoMes.get(g) ?? 0)] as [string, number]);
    const melhores = [...varOrcG].sort((a, b) => b[1] - a[1]);
    const piores = [...varOrcG].sort((a, b) => a[1] - b[1]);
    const ticketMes = movCatMes ? fatRealMes / movCatMes : 0;
    const ticketMesAA = movCatMesAA ? fatMesAAv / movCatMesAA : 0;
    D['slide02_faturamento'] = {
      tokens: { MES_ANO: `${mesNomeRef}/${refAno}` },
      headline: `[${ref.replace('/', '/20')}] Faturamento <span class="${atingPct >= 100 ? 'hl-pos' : 'hl-neg'}">${atingPct >= 100 ? '+' : MINUS}${brNum(Math.abs(atingPct - 100), 1)}% ${atingPct >= 100 ? 'acima' : 'abaixo'} da meta</span> — <span class="${fatAAPct >= 0 ? 'hl-pos' : 'hl-neg'}">${fmtVarPct(fatAAPct)} aa</span> · ${melhores[0][0]} lidera a contribuição positiva vs orçado`,
      subhl: `${melhores.slice(0, 2).map(([g, v]) => `${g} (${fmtVarMi(v)})`).join(' e ')} vs orçado · detratores: ${piores.slice(0, 2).map(([g, v]) => `${g} (${fmtVarMi(v)})`).join(' e ')}`,
      kpis: [
        { lbl: 'FAT. REALIZADO', val: fmtMi(fatRealMes), d1: setaPct(atingPct - 100) + ' vs orçado', d1c: atingPct >= 100 ? 'up' : 'down', d2: setaPct(fatAAPct) + ` vs ${ref.replace('/', '/20')}`.replace(String(refAno), String(anoAnt)), d2c: fatAAPct >= 0 ? 'up' : 'down', d2color: fatAAPct >= 0 ? '#0A8F5C' : undefined },
        { lbl: 'MOV. REALIZADA', val: fmtK(movCatMes, 0) + ' TON', vcolor: '#14204A', d1: setaPct(movAtingPct - 100) + ' vs orçado', d1c: movAtingPct >= 100 ? 'up' : 'down', d2: setaPct(movAAPct) + ' aa · apenas Cattalini', d2c: 'neu' },
        { lbl: 'TICKET MÉDIO / TON', val: `R$ ${brNum(ticketMes, 2)}`, vcolor: '#0A8F5C', d1: setaPct(pctSafe(ticketMes, ticketMesAA)) + ` vs ${refLabel(refMes, anoAnt).replace('/', '/20')}`, d1c: ticketMes >= ticketMesAA ? 'up' : 'down', d2: 'Receita por TON movimentada', d2c: 'neu' },
        { lbl: '% ATINGIMENTO', val: `${brNum(atingPct, 1)}%`, vcolor: atingPct >= 100 ? '#0A8F5C' : '#F59E0B', d1: atingPct >= 100 ? 'Meta batida no mês' : 'Abaixo da meta', d1c: atingPct >= 100 ? 'up' : 'warn', d2: `Meta: ${fmtMi(fatOrcMes)} · mov ${brNum(movAtingPct, 1)}%`, d2c: 'neu' },
      ],
      rows,
      total,
      ajudou: melhores.filter(([, v]) => v > 0).slice(0, 3).map(([g, v]) =>
        `<strong>${g} ${fmtVarMi(v)} vs orçado</strong> — contribuição positiva do mês`),
      pressionou: piores.filter(([, v]) => v < 0).slice(0, 3).map(([g, v]) =>
        ['down', `<strong>${g} ${fmtVarMi(v)} vs orçado</strong> — detrator do mês`] as [string, string]),
    };
    if (!D['slide02_faturamento'].ajudou.length) D['slide02_faturamento'].ajudou = ['<strong>Nenhum grupo acima do orçado</strong> no mês'];
    if (!D['slide02_faturamento'].pressionou.length) D['slide02_faturamento'].pressionou = [['warn', '<strong>Nenhum grupo abaixo do orçado</strong> no mês']];
  }

  // ---------- clientes (mês) — slide 03 e 06 ----------
  const isAcost = (s: string) => /acostagem|ag[êe]ncia mar[íi]tima/i.test(s);
  const fatCliMes = somaPor(fatMes.filter((r) => !isAcost(r.cliente)), (r) => r.cliente, (r) => r.valor);
  const fatCliMesAA = somaPor(fatMesAA.filter((r) => !isAcost(r.cliente)), (r) => r.cliente, (r) => r.valor);
  const ativos = [...fatCliMes.entries()].filter(([, v]) => v > 1000).sort((a, b) => b[1] - a[1]);
  const baseAA = [...fatCliMesAA.entries()].filter(([, v]) => v > 1000).map(([k]) => k);
  // novos = sem faturamento nos 12 meses anteriores da janela
  const fatCliJanela = new Set<string>();
  for (const m of jan.meses.slice(0, 12)) {
    for (const r of fat.filter((x) => x.ano === m.ano && x.mesN === m.mesN && x.valor > 1000)) fatCliJanela.add(r.cliente);
  }
  const novos = ativos.filter(([k]) => !fatCliJanela.has(k)).map(([k]) => k);
  const perdidos = baseAA.filter((k) => !(fatCliMes.get(k) ?? 0));
  const emRisco = ativos.filter(([k, v]) => {
    const aa = fatCliMesAA.get(k) ?? 0;
    return aa > 0 && v < aa * 0.7;
  }).map(([k]) => k);
  const retencao = baseAA.length ? ((baseAA.length - perdidos.length) / baseAA.length) * 100 : 100;
  // grupo principal por cliente no mês
  const cliGrupoMes = new Map<string, string>();
  {
    const tmp = new Map<string, Map<string, number>>();
    for (const r of fatMes) {
      if (!tmp.has(r.cliente)) tmp.set(r.cliente, new Map());
      const g = tmp.get(r.cliente)!;
      g.set(r.grupo, (g.get(r.grupo) ?? 0) + r.valor);
    }
    for (const [k, g] of tmp) cliGrupoMes.set(k, [...g.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }
  // ABC cliente MENSAL (Regra 12): A > 2,5Mi · B > 0,8Mi · C demais
  const abcCli = (v: number) => (v > 2_500_000 ? 'A' : v > 800_000 ? 'B' : 'C');

  {
    const top10 = ativos.slice(0, 10);
    const maxV = top10.length ? top10[0][1] : 1;
    const top3V = sum(ativos.slice(0, 3).map(([, v]) => v));
    const top10V = sum(top10.map(([, v]) => v));
    const rows = top10.map(([k, v], i) => {
      const aa = fatCliMesAA.get(k) ?? 0;
      const varPct = aa ? pctSafe(v, aa) : null;
      return [
        i + 1, k, abcCli(v), cliGrupoMes.get(k) ?? '—', Math.round((v / maxV) * 100),
        `R$ ${brNum(v / 1e6, 2)} Mi`, `${brNum((v / fatRealMes) * 100, 1)}%`,
        varPct === null ? 'novo' : setaPct(varPct), varPct === null ? 'up' : varPct >= 0 ? 'up' : 'down',
      ];
    });
    const quedaA = top10.filter(([k, v]) => abcCli(v) === 'A' && (fatCliMesAA.get(k) ?? 0) > 0 && v < (fatCliMesAA.get(k) ?? 0) * 0.9);
    const cresc20 = ativos.filter(([k, v]) => abcCli(v) === 'A' && (fatCliMesAA.get(k) ?? 0) > 0 && v > (fatCliMesAA.get(k) ?? 0) * 1.2);
    const novosV = sum(novos.map((k) => fatCliMes.get(k) ?? 0));
    const maiorQueda = [...ativos].filter(([k]) => (fatCliMesAA.get(k) ?? 0) > 0).sort((a, b) =>
      pctSafe(a[1], fatCliMesAA.get(a[0]) ?? 1) - pctSafe(b[1], fatCliMesAA.get(b[0]) ?? 1))[0];
    D['slide03_carteira_fat'] = {
      tokens: {
        MES_ANO: `${capitalizar(mesNomeRef)} ${refAno}`,
        MES_ANO_ANT: refLabel(refMes, anoAnt).replace('/', '/20'),
        MES_REF: `${ref.replace('/', '/20')}`,
        CLI_ATIVOS: String(ativos.length),
        TOP3_PCT: `${brNum((top3V / fatRealMes) * 100, 1)}%`,
      },
      headline: `<span class="${perdidos.length ? 'hl-neg' : 'hl-pos'}">${perdidos.length} clientes perdidos</span> vs ${refLabel(refMes, anoAnt)} — taxa de retenção <span class="${retencao >= 85 ? 'hl-pos' : 'hl-warn'}">${brNum(retencao, 1)}%</span> ${retencao >= 85 ? 'acima' : 'abaixo'} do referencial de 85%`,
      kpis: [
        { lbl: 'Clientes Ativos', val: String(ativos.length), sub: `+${novos.length} novos no período`, sub_cls: 'pos' },
        { lbl: 'Clientes Novos', val: String(novos.length), val_cls: 'pos', sub: 'sem fat. nos 12m anteriores' },
        { lbl: 'Clientes Perdidos', val: String(perdidos.length), val_cls: perdidos.length ? 'neg' : 'pos', sub: `vs ${refLabel(refMes, anoAnt)}`, sub_cls: perdidos.length ? 'neg' : undefined },
        { lbl: 'Em Risco', val: String(emRisco.length), val_cls: 'warn', sub: 'Queda &gt;30% vs. mesmo período AA' },
        { lbl: 'Taxa de Retenção', val: `${brNum(retencao, 1)}%`, val_cls: retencao >= 85 ? 'pos' : 'warn', sub: 'Referência: &gt;85% ideal' },
        { lbl: 'Fat. Top 3', val: fmtMi(top3V), sub: `${brNum((top3V / fatRealMes) * 100, 1)}% do total ${capitalizar(mesNomeRef)} ${refAno}` },
      ],
      rows,
      total: [fmtMi(top10V), `${brNum((top10V / fatRealMes) * 100, 1)}%`],
      sidecol: [
        { tag: 'Risco Elevado', cls: 'ctag-r', items: [{ a: 'warn', t: `<strong>${quedaA.length} clientes Cls A</strong> com queda &gt;10% vs ${refLabel(refMes, anoAnt)} — compensado por ${novos.length} novos clientes (<strong>+${fmtMi(novosV, false)}</strong>)` }] },
        { tag: 'Maior Risco', cls: 'ctag-r', items: maiorQueda ? [{ a: 'down', t: `<strong>${maiorQueda[0]} ${fmtVarPct(pctSafe(maiorQueda[1], fatCliMesAA.get(maiorQueda[0]) ?? 1))}</strong> vs ${refLabel(refMes, anoAnt)} — de ${fmtMi(fatCliMesAA.get(maiorQueda[0]) ?? 0, false)} para ${fmtMi(maiorQueda[1], false)}` }] : [{ a: 'neu', t: 'Sem quedas relevantes vs ano anterior' }] },
        { tag: 'Oportunidade', cls: 'ctag-g', items: [{ a: 'up', t: `<strong>${cresc20.length} clientes Cls A com crescimento &gt;20%</strong> — expandir contratos antes da renovação` }] },
      ],
      prioridades: [
        maiorQueda ? `Acionar plano de retenção para <strong>${maiorQueda[0]}</strong> — investigar perda e renegociar` : 'Manter plano de retenção da base Cls A',
        `Consolidar os <strong>${novos.length} novos clientes</strong> (+${fmtMi(novosV, false)}) — priorizar contratos de prazo`,
        `Expandir nos <strong>${cresc20.length} clientes &gt;20% aa</strong> — propor aditivos contratuais`,
      ],
    };
  }

  // ---------- SLIDE 04 (mov cliente YTD) ----------
  {
    if (!rawMovC) {
      addPend('04', 'slide04_carteira_mov', 'Movimentação por cliente não mapeada — aba "Mov - Realizada(Cliente)" ou print CLIENTES x MOV.', 'block');
    }
    const anosC = movC.map((r) => r.ano);
    const ultimoMesC = movC.filter((r) => r.ano === refAno).reduce((mx, r) => Math.max(mx, r.mesN), 0) || refMes;
    const ytdC = movC.filter((r) => r.ano === refAno && r.mesN <= ultimoMesC && !isAcost(r.cliente));
    const ytdCAA = movC.filter((r) => r.ano === anoAnt && r.mesN <= ultimoMesC && !isAcost(r.cliente));
    const porCli = somaPor(ytdC, (r) => r.cliente, (r) => r.ton);
    const porCliAA = somaPor(ytdCAA, (r) => r.cliente, (r) => r.ton);
    const totalYtdC = sum([...porCli.values()]);
    const topo = [...porCli.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxV = topo.length ? topo[0][1] : 1;
    // produto principal por cliente
    const cliProd = new Map<string, string>();
    {
      const tmp = new Map<string, Map<string, number>>();
      for (const r of ytdC) {
        if (!tmp.has(r.cliente)) tmp.set(r.cliente, new Map());
        const g = tmp.get(r.cliente)!;
        g.set(r.produto, (g.get(r.produto) ?? 0) + r.ton);
      }
      for (const [k, g] of tmp) {
        const p = [...g.entries()].sort((a, b) => b[1] - a[1])[0][0];
        const pretty = p.toLowerCase().split(' ').map(capitalizar).join(' ');
        cliProd.set(k, pretty.length > 16 ? pretty.slice(0, 14) + '.' : pretty);
      }
    }
    const abcVol = (v: number) => (v >= totalYtdC * 0.03 ? 'A' : v >= totalYtdC * 0.015 ? 'B' : 'C');
    const rows = topo.map(([k, v], i) => {
      const aa = porCliAA.get(k) ?? 0;
      const bw = Math.round((v / maxV) * 1000) / 10;
      return [
        i + 1, k, cliProd.get(k) ?? '—', abcVol(v), i === 0 ? 100 : bw,
        `${fmtK(v)} TON`, aa ? fmtK(aa) : '—', aa ? setaPct(pctSafe(v, aa)) : 'novo', !aa || v >= aa ? 'up' : 'down',
      ];
    });
    const totalAA = sum([...porCliAA.values()]);
    const varTotal = totalAA ? pctSafe(totalYtdC, totalAA) : 0;
    const periodo = `YTD Jan–${capitalizar(refLabel(ultimoMesC, refAno).split('/')[0])}/${refAno}`;
    const novosC = [...porCli.keys()].filter((k) => !(porCliAA.get(k) ?? 0));
    const novosVol = sum(novosC.map((k) => porCli.get(k) ?? 0));
    const quedas = topo.filter(([k, v]) => (porCliAA.get(k) ?? 0) > 0 && v < (porCliAA.get(k) ?? 0) * 0.9)
      .sort((a, b) => pctSafe(a[1], porCliAA.get(a[0]) ?? 1) - pctSafe(b[1], porCliAA.get(b[0]) ?? 1));
    const grupoVol = somaPor(ytdC, (r) => r.grupo || '—', (r) => r.ton);
    const topGrupos = [...grupoVol.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
    const pctTop2 = Math.round((sum(topGrupos.map(([, v]) => v)) / totalYtdC) * 100);
    const ticketYtd = movCatYtd ? fatYtdV / movCatYtd : 0;
    const ticketYtdAA = movCatYtdAA ? fatYtdAAv / movCatYtdAA : 0;
    D['slide04_carteira_mov'] = {
      tokens: { PERIODO: periodo, PERIODO_ANT: `jan–${refLabel(ultimoMesC, anoAnt)}`, MES_ANO: `${capitalizar(mesNomeRef)} ${refAno}` },
      headline: `${topGrupos.map(([g]) => g).join(' e ')} concentram <span class="hl-pos">${pctTop2}%</span> do volume — variação total <span class="${varTotal >= 0 ? 'hl-pos' : 'hl-neg'}">${fmtVarPct(varTotal)} aa</span>`,
      subhl: `${periodo} · ${fmtK(totalYtdC)} TON realizados · comparação vs. jan–${refLabel(ultimoMesC, anoAnt)} · Top 10 por movimentação`,
      kpis: [
        { lbl: 'Mov. Realizada YTD', val: `${brNum(totalYtdC / 1000, 1)} kTON`, subs: [[setaPct(varTotal) + ' vs. ano anterior', varTotal >= 0 ? 'pos' : 'neg'], [`${refAno} · meses 01–${String(ultimoMesC).padStart(2, '0')}`, '']] },
        { lbl: 'Maior Volume', val: topo.length ? topo[0][0] : '—', vsize: '18px', subs: [[`${fmtK(topo[0]?.[1] ?? 0)} TON · ${brNum(((topo[0]?.[1] ?? 0) / totalYtdC) * 100, 1)}% do total`, ''], [(porCliAA.get(topo[0]?.[0] ?? '') ?? 0) ? setaPct(pctSafe(topo[0][1], porCliAA.get(topo[0][0])!)) + ` vs. jan–${refLabel(ultimoMesC, anoAnt)}` : 'novo no período', 'pos']] },
        { lbl: 'Ticket Médio / TON', val: `R$ ${brNum(ticketYtd, 2)}`, subs: [[setaPct(pctSafe(ticketYtd, ticketYtdAA)) + ' vs. ano anterior', ticketYtd >= ticketYtdAA ? 'pos' : 'neg'], ['Receita por tonelada movimentada', '']] },
        { lbl: 'Gap vs. Orçado', val: `${movCatYtd - movOrcYtd >= 0 ? '+' : MINUS}${brNum(Math.abs(movCatYtd - movOrcYtd) / 1000, 1)} kTON`, vcls: movCatYtd >= movOrcYtd ? 'pos' : 'warn', subs: [[`${fmtVarPct(movOrcYtd ? (movCatYtd / movOrcYtd - 1) * 100 : 0)} vs. orçado`, ''], [`Atingimento: ${brNum(movOrcYtd ? (movCatYtd / movOrcYtd) * 100 : 0, 1)}%`, 'warn']] },
      ],
      rows,
      sidecol: [
        { tag: 'Risco Elevado', cls: 'ctag-r', items: [{ a: 'warn', t: `<strong>${quedas.length} clientes do Top 10</strong> com queda &gt;10% aa — compensado por ${novosC.length} novos clientes (<strong>+${fmtK(novosVol)} TON</strong>)` }] },
        { tag: 'Maior Risco', cls: 'ctag-r', items: quedas.slice(0, 3).map(([k, v]) => ({ a: 'down', t: `<strong>${k} ${fmtVarPct(pctSafe(v, porCliAA.get(k) ?? 1))}</strong> — de ${fmtK(porCliAA.get(k) ?? 0)} para ${fmtK(v)} TON` })) },
        { tag: 'Oportunidade', cls: 'ctag-g', items: topo.filter(([k, v]) => (porCliAA.get(k) ?? 0) > 0 && v > (porCliAA.get(k) ?? 0) * 1.2).slice(0, 2).map(([k, v]) => ({ a: 'up', t: `<strong>${k} ${fmtVarPct(pctSafe(v, porCliAA.get(k) ?? 1))}</strong> em volume — expandir capacidade alocada` })) },
      ],
      prioridades: [
        quedas.length ? `Acionar recuperação para <strong>${quedas[0][0]}</strong> — renegociar volume mínimo contratual` : 'Manter acompanhamento da base Top 10',
        `Consolidar os <strong>${novosC.length} novos clientes</strong> (+${fmtK(novosVol)} TON) — contratos com volume mínimo`,
        'Expandir capacidade para os clientes em crescimento &gt;20% aa antes do pico de demanda',
      ],
    };
    // sidecol vazio quebra layout — garante ao menos 1 item
    for (const b of D['slide04_carteira_mov'].sidecol) {
      if (!b.items.length) b.items = [{ a: 'neu', t: 'Sem destaques no período' }];
    }
    if (anosC.length && !ytdCAA.length) {
      addPend('04', 'slide04_carteira_mov', 'Sem base do ano anterior na aba de mov por cliente — variações aa ficam como "novo".', 'warn');
    }
  }

  // ---------- SLIDES 05/06 (ABC) ----------
  {
    // produtos (grupos), Acostagem FORA (Regra 12 / json-schema)
    const classes = { A: [] as [string, number][], B: [] as [string, number][], C: [] as [string, number][] };
    for (const [g, v] of gruposDesc) classes[abcGrupo.get(g) as 'A' | 'B' | 'C'].push([g, v]);
    const cliAtivos = ativos; // já sem acostagem
    const clsCli = { A: cliAtivos.filter(([, v]) => abcCli(v) === 'A'), B: cliAtivos.filter(([, v]) => abcCli(v) === 'B'), C: cliAtivos.filter(([, v]) => abcCli(v) === 'C') };
    const cards = [
      ['ca', 'a', 'Classe A — Produtos', fmtMi(sum(classes.A.map(([, v]) => v))), `${Math.round((sum(classes.A.map(([, v]) => v)) / fatRealMes) * 100)}% · ${classes.A.length} produtos`],
      ['cb', 'b', 'Classe B — Produtos', fmtMi(sum(classes.B.map(([, v]) => v))), `${Math.round((sum(classes.B.map(([, v]) => v)) / fatRealMes) * 100)}% · ${classes.B.length} produtos`],
      ['cc', 'c', 'Classe C — Produtos', fmtMi(sum(classes.C.map(([, v]) => v))), `${Math.round((sum(classes.C.map(([, v]) => v)) / fatRealMes) * 100)}% · ${classes.C.length} produtos`],
      ['ca', 'a', 'Classe A — Clientes', fmtMi(sum(clsCli.A.map(([, v]) => v))), `${Math.round((sum(clsCli.A.map(([, v]) => v)) / fatRealMes) * 100)}% · ${clsCli.A.length} clientes`],
      ['cb', 'b', 'Classe B — Clientes', fmtMi(sum(clsCli.B.map(([, v]) => v))), `${Math.round((sum(clsCli.B.map(([, v]) => v)) / fatRealMes) * 100)}% · ${clsCli.B.length} clientes`],
      ['cc', 'c', 'Classe C — Clientes', fmtMi(sum(clsCli.C.map(([, v]) => v))), `${Math.round((sum(clsCli.C.map(([, v]) => v)) / fatRealMes) * 100)}% · ${clsCli.C.length} clientes · A&gt;2,5Mi B&gt;0,8Mi`],
    ];
    const refCap = `${capitalizar(ref.split('/')[0])}/${String(refAno).slice(2)}`;
    // pareto produto
    const maxG = gruposDesc.length ? gruposDesc[0][1] : 1;
    let cum = 0;
    const pareto = gruposDesc.map(([g, v]) => {
      cum += (v / fatRealMes) * 100;
      const orc = orcGrupoMes.get(g) ?? 0;
      const aa = fatGrupoMesAA.get(g) ?? 0;
      const vsOrc = orc ? pctSafe(v, orc) : null;
      const vsAA = aa ? pctSafe(v, aa) : null;
      const w = Math.round((v / maxG) * 100);
      return [
        abcGrupo.get(g), grupoCurto(g), `col-${(abcGrupo.get(g) ?? 'c').toLowerCase()}`, w,
        w >= 12 ? `${fmtMi(v, false)} · ${Math.round((v / fatRealMes) * 100)}%` : '',
        `${Math.round(cum)}%`,
        vsOrc === null ? ['s/orç', 'down'] : [fmtVarPct(vsOrc), vsOrc >= 0 ? 'up' : 'down'],
        vsAA === null ? ['novo', 'up'] : [fmtVarPct(vsAA), vsAA >= 0 ? 'up' : 'down'],
      ];
    });
    const segs = gruposDesc.map(([g, v]) => [grupoCurto(g), Math.round((v / fatRealMes) * 100), COR_GRUPO[g] ?? '#5A82B5']);
    const posit = gruposDesc.filter(([g, v]) => (fatGrupoMesAA.get(g) ?? 0) > 0 && v > (fatGrupoMesAA.get(g) ?? 0)).slice(0, 2);
    const negat = gruposDesc.filter(([g, v]) => (orcGrupoMes.get(g) ?? 0) > 0 && v < (orcGrupoMes.get(g) ?? 0)).slice(0, 2);
    D['slide05_abc_produto'] = {
      headline: `<span class="hl-up">${classes.A.length} produtos Cls A</span> (${classes.A.map(([g]) => grupoCurto(g)).join(' + ')}) concentram <span class="hl-up">${Math.round((sum(classes.A.map(([, v]) => v)) / fatRealMes) * 100)}%</span> do faturamento (${fmtMi(sum(classes.A.map(([, v]) => v)))}) · <span class="hl-up">${clsCli.A.length} clientes Cls A</span> = ${Math.round((sum(clsCli.A.map(([, v]) => v)) / fatRealMes) * 100)}% da receita`,
      hl_sub: `${ref.replace('/', '/20')} · Fat. total ${fmtMi(fatRealMes, false)} · Concentração por produto e por cliente · Var. vs. orçado e vs. ${refLabel(refMes, anoAnt)}`,
      cards,
      donut_title: `Fat. por Produto — ${refCap}`,
      donut_center: [fmtMi(fatRealMes, false), `FAT. ${refCap.toUpperCase()}`],
      segs,
      pareto_lbl: `Pareto — Faturamento por Produto · ${ref.replace('/', '/20')}`,
      pareto,
      callouts: [
        { tag: 'Concentração — alerta', items: [{ a: 'warn', t: `<strong>${classes.A.map(([g]) => grupoCurto(g)).join(' + ')} = ${Math.round((sum(classes.A.map(([, v]) => v)) / fatRealMes) * 100)}%</strong> da receita — dependência alta. Risco em renovações` }] },
        { tag: 'Destaques positivos', items: posit.map(([g, v]) => ({ a: 'up', t: `<strong>${grupoCurto(g)} ${fmtVarPct(pctSafe(v, fatGrupoMesAA.get(g) ?? 1))} aa</strong> — crescimento vs ${refLabel(refMes, anoAnt)}` })) },
        { tag: 'Ação necessária', items: negat.map(([g, v]) => ({ a: 'down', t: `<strong>${grupoCurto(g)} ${fmtVarPct(pctSafe(v, orcGrupoMes.get(g) ?? 1))} vs orçado</strong> — ${fmtMi(v, false)} vs ${fmtMi(orcGrupoMes.get(g) ?? 0, false)} orçados` })) },
      ],
    };
    for (const b of D['slide05_abc_produto'].callouts) {
      if (!b.items.length) b.items = [{ a: 'neu', t: 'Sem destaques — conferir orçamento mapeado' }];
    }
    // slide 06
    const maioresCli = clsCli.A;
    const paleta = ['#F5C400', '#14204A', '#3D6FCC', '#5A82B5', '#7B9FE8', '#A8C4FF', '#C8D8FF', '#DCE7F5', '#EDF2FA', '#F4F7FC'];
    const segs6 = [
      ...maioresCli.slice(0, 8).map(([k, v], i) => [k, Math.round((v / fatRealMes) * 100), paleta[i]]),
      ['Nível B', Math.round((sum(clsCli.B.map(([, v]) => v)) / fatRealMes) * 100), '#1D9E75'],
      ['Nível C', Math.round((sum(clsCli.C.map(([, v]) => v)) / fatRealMes) * 100), '#E4E7F0'],
    ];
    const isNovo = (k: string) => novos.includes(k);
    const emQuedaA = maioresCli.filter(([k, v]) => (fatCliMesAA.get(k) ?? 0) > 0 && v < (fatCliMesAA.get(k) ?? 0));
    D['slide06_abc_cliente'] = {
      headline: `<span class="hl-up">${clsCli.A.length} clientes Cls A</span> concentram <span class="hl-up">${Math.round((sum(clsCli.A.map(([, v]) => v)) / fatRealMes) * 100)}%</span> do faturamento (${fmtMi(sum(clsCli.A.map(([, v]) => v)))}) — taxa de retenção <span class="${retencao >= 85 ? 'hl-up' : 'hl-down'}">${brNum(retencao, 1)}%</span>`,
      hl_sub: `${ref.replace('/', '/20')} · ${ativos.length} clientes ativos · Fat. total ${fmtMi(fatRealMes, false)} · Classificação: A &gt;R$2,5Mi · B &gt;R$0,8Mi · C demais`,
      cards,
      donut_title: `Carteira — ${refCap}`,
      donut_center: [String(ativos.length), 'CLIENTES'],
      segs: segs6,
      niveis: [
        { badge: 'a', label: 'Nível A', meta: `${Math.round((sum(clsCli.A.map(([, v]) => v)) / fatRealMes) * 100)}% do fat. · ${clsCli.A.length} clientes · &gt;R$2,5Mi`, pills: clsCli.A.map(([k, v]) => [`${k} ${brNum((v / fatRealMes) * 100, 1)}%`, isNovo(k) ? 1 : 0]) },
        { badge: 'b', label: 'Nível B', meta: `${Math.round((sum(clsCli.B.map(([, v]) => v)) / fatRealMes) * 100)}% do fat. · ${clsCli.B.length} clientes · &gt;R$0,8Mi`, pills: clsCli.B.map(([k]) => [k, isNovo(k) ? 1 : 0]) },
        { badge: 'c', label: 'Nível C', meta: `${Math.round((sum(clsCli.C.map(([, v]) => v)) / fatRealMes) * 100)}% do fat. · ${clsCli.C.length} clientes · demais`, pills: clsCli.C.map(([k]) => [k, isNovo(k) ? 1 : 0]) },
      ],
      callouts: [
        { tag: 'Concentração — alerta', items: [
          { a: 'warn', t: `<strong>${clsCli.A.length} clientes Cls A = ${Math.round((sum(clsCli.A.map(([, v]) => v)) / fatRealMes) * 100)}%</strong> da receita — risco elevado se 1–2 saírem` },
          { a: 'warn', t: `<strong>${ativos[0]?.[0] ?? '—'} = ${brNum(((ativos[0]?.[1] ?? 0) / fatRealMes) * 100, 1)}%</strong> do fat. — maior cliente do mês` },
        ] },
        { tag: 'Expansão de carteira', items: [{ a: 'up', t: `<strong>${novos.length} novos clientes</strong> incorporados no mês — base em expansão` }] },
        { tag: 'Retenção', items: [
          { a: retencao >= 85 ? 'up' : 'down', t: `<strong>Taxa de retenção ${brNum(retencao, 1)}%</strong> — referencial: 85%` },
          ...(emQuedaA.length ? [{ a: 'neu', t: `<strong>${emQuedaA.slice(0, 2).map(([k]) => k).join('</strong> e <strong>')}</strong> — Cls A em queda vs ${refLabel(refMes, anoAnt)}` }] : []),
        ] },
      ],
    };
  }

  // ---------- SLIDES 07/08 (12M rolling) ----------
  {
    const meses12 = jan.meses.slice(1);
    const fat12 = fat.filter((r) => meses12.some((m) => m.ano === r.ano && m.mesN === r.mesN));
    const totMes = meses12.map((m) => sum(fat.filter((r) => r.ano === m.ano && r.mesN === m.mesN).map((r) => r.valor)));
    const servMap: [string, RegExp][] = [
      ['Take or Pay', /take or pay/i], ['Des/Embarque', /embarque/i], ['SOP', /^sop$/i],
      ['Outros Serviços', /outros/i], ['Excedente/2ºGiro', /excedente/i],
    ];
    const tot12 = sum(fat12.map((r) => r.valor));
    const split7 = servMap.map(([, re]) => Math.round((sum(fat12.filter((r) => re.test(r.servico)).map((r) => r.valor)) / tot12) * 100));
    const topCliYtd = [...somaPor(fatYtd.filter((r) => !isAcost(r.cliente)), (r) => r.cliente, (r) => r.valor).entries()].sort((a, b) => b[1] - a[1])[0];
    D['slide07_receita_servico'] = {
      headline: `Take or Pay domina <span class="hl-pos">${D['kpis_gerais'].take_or_pay_pct}%</span> da receita — base contratual de <span class="hl-pos">${D['kpis_gerais'].contratos_12m_pct}%</span> em contratos &gt;12 meses`,
      subhl: `${ref.replace('/', '/20')} · Receita bruta YTD ${fmtMi(fatYtdV, false)} · 12 meses rolling (${meses12[0].label} – ${ref}) · valores em R$ x 1.000`,
      chart_lbl: `Receita Bruta por Serviço — 12M Rolling (R$ x 1.000) · ${meses12[0].label} → ${ref}`,
      kpis: [
        { lbl: `Fat. YTD Jan–${capitalizar(ref.split('/')[0])}`, val: `R$ ${brNum(fatYtdV / 1e6, 2)} Mi`, sub: setaPct(fatYtdAAPct) + ` vs jan–${refLabel(refMes, anoAnt)}`, sub_cls: fatYtdAAPct >= 0 ? 'pos' : 'neg' },
        { lbl: 'Ticket / TON', val: `R$ ${brNum(D['kpis_gerais'].ticket_ton, 2)}`, sub: 'Receita por tonelada' },
        { lbl: 'Ticket / M³', val: `R$ ${brNum(D['kpis_gerais'].ticket_m3, 2)}`, sub: 'Receita por metro cúbico' },
        { lbl: 'Contratos &gt;12M', val: `${D['kpis_gerais'].contratos_12m_pct}%`, val_cls: 'pos', sub: 'Base estável' },
        { lbl: 'Take or Pay', val: `${D['kpis_gerais'].take_or_pay_pct}%`, val_cls: 'pos', sub: 'Predominante' },
        { lbl: 'Espaço M³ YTD', val: `${fmtInt(D['kpis_gerais'].espaco_ytd_m3)} m³`, sub: 'média mensal YTD' },
      ],
      chart: {
        axis_max: 75000,
        months: meses12.map((m) => m.label).concat(), // 12 rótulos do template
        totals: totMes.map((v) => Math.round(v / 1000)),
        split: split7,
        colors: ['#14204A', '#3D6FCC', '#F5C400', '#F0A33A', '#C8D4DF'],
        legend: ['Take or Pay', 'Des/Embarque', 'SOP', 'Outros Serviços', 'Excedente/2ºGiro'],
        foot: 'Totais mensais reais. Split por serviço = composição 12M.',
      },
      sidecol: [
        { tag: 'Base Contratual', cls: 'ctag-n', items: [
          { a: 'up', t: `<strong>Take or Pay = ${D['kpis_gerais'].take_or_pay_pct}%</strong> da receita — recorrente e previsível` },
          { a: 'up', t: `<strong>${D['kpis_gerais'].contratos_12m_pct}% em contratos &gt;12M</strong> — baixa exposição a spot` },
        ] },
        { tag: 'Atenção', cls: 'ctag-y', items: [
          { a: 'warn', t: `<strong>Excedente = ${split7[4]}% da receita</strong> — oportunidade de ampliar serviços complementares` },
        ] },
        { tag: 'Top Cliente', cls: 'ctag-n', items: [
          { a: 'warn', t: `<strong>${topCliYtd?.[0] ?? '—'}</strong> — maior faturador YTD (${fmtMi(topCliYtd?.[1] ?? 0, false, 2)})` },
        ] },
      ],
    };
    // slide 08 — espaço m³ por tipo de contrato
    const m3Mes = meses12.map((m) => m3PorMes.get(`${m.ano}-${m.mesN}`) ?? 0);
    const contrMap: [string, RegExp][] = [
      ['&gt;12 meses', /> ?12/i], ['&lt;12 meses', /< ?12/i], ['Embarque/Desembarque', /embarque/i], ['Excedente', /excedente/i],
    ];
    const fat12m3 = fat12.filter((r) =>
      (r.servicoRaw ? SERV_ESPACO.test(r.servicoRaw) : true) && contrMap.some(([, re]) => re.test(r.contrato)));
    const totM3Contr = sum(fat12m3.map((r) => r.m3));
    const split8 = contrMap.map(([, re]) => Math.round((sum(fat12m3.filter((r) => re.test(r.contrato)).map((r) => r.m3)) / (totM3Contr || 1)) * 100));
    const maxM3 = Math.max(...m3Mes);
    const iMax = m3Mes.indexOf(maxM3);
    D['slide08_espaco_m3'] = {
      headline: `Espaço faturado — média 12M de <span class="hl-pos">${fmtInt(D['kpis_gerais'].espaco_12m_med_m3)} m³</span>, com ${ref} em <span class="hl-pos">${fmtInt(m3Mes[11] ?? 0)} m³</span> e <span class="hl-pos">${split8[0]}%</span> em contratos &gt;12 meses`,
      subhl: `12M Rolling (${meses12[0].label} → ${ref}) · Espaço Faturado M³ por tipo de contrato · média 12M ${fmtInt(D['kpis_gerais'].espaco_12m_med_m3)} m³`,
      chart_lbl: `Espaço Faturado M³ por Tipo de Contrato — 12M Rolling · ${meses12[0].label} → ${ref}`,
      kpis: [
        { lbl: 'Média 12M Rolling', val: `${fmtInt(D['kpis_gerais'].espaco_12m_med_m3)} m³`, sub: `${meses12[0].label} → ${ref}` },
        { lbl: 'Espaço M³ YTD', val: `${fmtInt(D['kpis_gerais'].espaco_ytd_m3)} m³`, sub: 'média mensal YTD' },
        { lbl: capitalizar(ref), val: `${fmtInt(m3Mes[11] ?? 0)} m³`, sub: (m3Mes[11] ?? 0) >= D['kpis_gerais'].espaco_12m_med_m3 ? 'acima da média 12M' : 'abaixo da média 12M' },
        { lbl: 'Maior mês', val: `${fmtInt(maxM3)} m³`, sub: `${meses12[iMax]?.label} · pico 12M` },
        { lbl: '&gt;12 Meses', val: `${split8[0]}%`, val_cls: 'pos', sub: 'base contratual' },
        { lbl: 'Excedente', val: `${split8[3]}%`, sub: 'do espaço faturado' },
      ],
      chart: {
        axis_max: 1000000,
        months: meses12.map((m) => m.label),
        totals: m3Mes.map((v) => Math.round(v)),
        split: split8,
        colors: ['#14204A', '#A8C4FF', '#3D6FCC', '#C8D4DF'],
        legend: ['&gt;12 meses', '&lt;12 meses', 'Embarque/Desembarque', 'Excedente'],
        foot: 'Totais mensais reais (m³). Split por tipo de contrato = composição 12M.',
      },
      sidecol: [
        { tag: 'Expansão de tancagem', cls: 'ctag-n', items: [
          { a: 'up', t: `<strong>${meses12[iMax]?.label} com ${fmtInt(maxM3)} m³</strong> — maior marca dos 12 meses` },
          { a: 'up', t: `<strong>${split8[0]}% em contratos &gt;12 meses</strong> — base sólida e previsível` },
        ] },
        { tag: 'Atenção', cls: 'ctag-y', items: [
          { a: 'warn', t: `<strong>Vale em ${meses12[m3Mes.indexOf(Math.min(...m3Mes))]?.label}</strong> (${fmtInt(Math.min(...m3Mes))} m³) — sazonalidade a monitorar` },
        ] },
        { tag: 'Excedente', cls: 'ctag-n', items: [
          { a: 'up', t: `<strong>Excedente/2º giro = ${split8[3]}%</strong> do espaço — oportunidade de converter em contratos firmes` },
        ] },
      ],
    };
  }

  // ---------- SLIDES 09/10/11 (mov por grupo) ----------
  const movGrupoAcum = (ano: number) =>
    somaPor(movCat.filter((r) => r.ano === ano && r.mesN <= refMes), (r) => r.grupo, (r) => r.ton);
  const movGrupoMesAno = (ano: number) =>
    somaPor(movCat.filter((r) => r.ano === ano && r.mesN === refMes), (r) => r.grupo, (r) => r.ton);
  const gk = (m: Map<string, number>, fold = true) => {
    const o: Record<string, number> = { met: 0, der: 0, aq: 0, ov: 0, sc: 0, bio: 0, out: 0 };
    for (const [g, v] of m) {
      const k = GKEY[g] ?? 'out';
      o[k] += v;
    }
    if (fold) { o.out += o.bio; }
    return o;
  };
  const anos4 = [refAno - 3, refAno - 2, refAno - 1, refAno];
  {
    const acum = anos4.map((a) => ({ a, m: gk(movGrupoAcum(a)) }));
    const orcAc = gk(somaPor(movOrc.filter((r) => r.ano === refAno && r.mesN <= refMes), (r) => r.grupo, (r) => r.ton));
    const totais = acum.map(({ m }) => m.met + m.der + m.aq + m.ov + m.sc + m.out);
    const totOrc = orcAc.met + orcAc.der + orcAc.aq + orcAc.ov + orcAc.sc + orcAc.out;
    const maxTot = Math.max(...totais, totOrc);
    const gap = movCatYtd - movOrcYtd;
    const mesCap = capitalizar(ref.split('/')[0]);
    const grpYtd = [...movGrupoAcum(refAno).entries()].sort((x, y) => y[1] - x[1]);
    const top2 = grpYtd.slice(0, 2);
    const pctTop2 = Math.round((sum(top2.map(([, v]) => v)) / (movCatYtd || 1)) * 100);
    const pico = Math.max(...totais);
    const anoPico = acum[totais.indexOf(pico)].a;
    D['slide09_mov_acumulado'] = {
      headline: `${refAno} acumula <span class="hl-pos">${brNum(movCatYtd / 1000, 1)} kTON</span> em Jan–${mesCap} — <span class="${movYtdAAPct >= 0 ? 'hl-pos' : 'hl-neg'}">${fmtVarPct(movYtdAAPct)} vs ${anoAnt}</span> e <span class="${gap >= 0 ? 'hl-pos' : 'hl-neg'}">${fmtVarPct(movOrcYtd ? (movCatYtd / movOrcYtd - 1) * 100 : 0)} vs orçado</span> · ${top2.map(([g]) => g).join(' e ')} dominam ${pctTop2}% do volume`,
      subhl: `Acumulado Jan–${mesCap} · ${anos4[0]} → ${refAno} · Comparação vs. orçado Jan–${mesCap}/${String(refAno).slice(2)} · Movimentação em TON por grupo de produto`,
      chart_lbl: `Movimentação Acumulada Jan–${mesCap} (TON) · ${anos4[0]} → ${refAno} · por Categoria de Produto`,
      kpis: [
        { lbl: `Mov. YTD ${refAno}`, val: `${brNum(movCatYtd / 1000, 1)} kTON`, val_cls: 'pos', sub: `${setaPct(movYtdAAPct)} vs jan–${refLabel(refMes, anoAnt)}`, sub_cls: movYtdAAPct >= 0 ? 'pos' : 'neg' },
        { lbl: `Orçado Jan–${mesCap}/${String(refAno).slice(2)}`, val: `${brNum(movOrcYtd / 1000, 1)} kTON`, sub: `${setaPct(movOrcYtd ? (movCatYtd / movOrcYtd - 1) * 100 : 0)} vs realizado`, sub_cls: gap >= 0 ? 'pos' : 'neg' },
        { lbl: 'Gap vs Orçado', val: `${gap >= 0 ? '+' : MINUS}${brNum(Math.abs(gap) / 1000, 1)} kTON`, val_cls: gap >= 0 ? 'pos' : 'neg', sub: `Atingimento ${brNum(movOrcYtd ? (movCatYtd / movOrcYtd) * 100 : 0, 1)}%` },
        { lbl: top2.map(([g]) => (g === 'Óleo Vegetal' ? 'Óleo Veg.' : g)).join(' + '), val: `${pctTop2}%`, val_cls: 'pos', sub: `do volume realizado ${refAno}` },
        { lbl: `vs Jan–${mesCap}/${anoAnt}`, val: `${brNum(movCatYtdAA / 1000, 1)} kTON`, sub: 'mesmo período anterior' },
        { lbl: `Pico (${anoPico})`, val: `${brNum(pico / 1000, 1)} kTON`, sub: `vs pico ${fmtVarPct((movCatYtd / (pico || 1) - 1) * 100)}` },
      ],
      callouts: [
        { tag: `Crescimento ${refAno}`, tag_cls: 'ctag-n', items: [
          { a: movYtdAAPct >= 0 ? 'up' : 'down', t: `<strong>${fmtVarPct(movYtdAAPct)} vs ${anoAnt}</strong> no acumulado Jan–${mesCap}` },
          { a: 'up', t: `<strong>${top2[0]?.[0] ?? '—'} lidera</strong> com ${Math.round(((top2[0]?.[1] ?? 0) / (movCatYtd || 1)) * 100)}% do volume` },
        ] },
        { tag: 'Vs orçado — atenção', tag_cls: 'ctag-y', items: [
          { a: gap >= 0 ? 'up' : 'down', t: `<strong>${fmtVarPct(movOrcYtd ? (movCatYtd / movOrcYtd - 1) * 100 : 0)} vs orçado</strong> (gap ${gap >= 0 ? '+' : MINUS}${brNum(Math.abs(gap) / 1000, 0)}k TON)` },
        ] },
        { tag: 'Contexto histórico', tag_cls: 'ctag-n', items: [
          { a: 'warn', t: `<strong>${anoPico} foi o pico</strong> (${brNum(pico / 1000, 1)}k TON) — ${refAno} está a ${fmtVarPct((movCatYtd / (pico || 1) - 1) * 100)} do topo` },
        ] },
      ],
      chart: {
        engine: 'group_stacked',
        y_max: Math.ceil((maxTot * 1.1) / 100000) * 100000,
        unit: 'Ton',
        anos: [
          ...acum.map(({ a, m }) => ({ lbl: String(a), isOrc: false, met: Math.round(m.met), der: Math.round(m.der), aq: Math.round(m.aq), ov: Math.round(m.ov), sc: Math.round(m.sc), out: Math.round(m.out) })),
          { lbl: `Orçado\\nJan-${ref.split('/')[0]}/${String(refAno).slice(2)}`, isOrc: true, met: Math.round(orcAc.met), der: Math.round(orcAc.der), aq: Math.round(orcAc.aq), ov: Math.round(orcAc.ov), sc: Math.round(orcAc.sc), out: Math.round(orcAc.out) },
        ],
      },
    };
    // slide 10 — mês histórico
    const mesA = anos4.map((a) => ({ a, m: gk(movGrupoMesAno(a)) }));
    const orcM = gk(movOrcGrupoMes);
    const totaisM = mesA.map(({ m }) => m.met + m.der + m.aq + m.ov + m.sc + m.out);
    const totOrcM = orcM.met + orcM.der + orcM.aq + orcM.ov + orcM.sc + orcM.out;
    const picoM = Math.max(...totaisM);
    const anoPicoM = mesA[totaisM.indexOf(picoM)].a;
    const gapM = movCatMes - movOrcMes;
    D['slide10_mov_maio'] = {
      headline: `${capitalizar(mesNomeRef)}/${refAno} movimenta <span class="hl-pos">${brNum(movCatMes / 1000, 1)} kTON</span> — <span class="${movAAPct >= 0 ? 'hl-pos' : 'hl-neg'}">${fmtVarPct(movAAPct)} vs ${refLabel(refMes, anoAnt)}</span> e <span class="${gapM >= 0 ? 'hl-pos' : 'hl-neg'}">${fmtVarPct(movOrcMes ? (movCatMes / movOrcMes - 1) * 100 : 0)} vs orçado</span>`,
      subhl: `Movimentação do mês de ${capitalizar(mesNomeRef)} · ${anos4[0]} → ${refAno} + Orçado · por grupo de produto (TON) · série histórica do mês`,
      chart_lbl: `Movimentação de ${capitalizar(mesNomeRef)} (TON) · ${anos4[0]} → ${refAno} + Orçado · por Categoria de Produto`,
      kpis: [
        { lbl: `${capitalizar(ref.split('/')[0])}/${refAno}`, val: `${brNum(movCatMes / 1000, 1)} kTON`, sub: `${setaPct(movAAPct)} vs ${refLabel(refMes, anoAnt)}`, sub_cls: movAAPct >= 0 ? 'pos' : 'neg' },
        { lbl: `Orçado ${capitalizar(mesNomeRef)}/${String(refAno).slice(2)}`, val: `${brNum(movOrcMes / 1000, 1)} kTON`, sub: 'meta do mês' },
        { lbl: 'Gap vs Orçado', val: `${gapM >= 0 ? '+' : MINUS}${brNum(Math.abs(gapM) / 1000, 1)} kTON`, val_cls: gapM >= 0 ? 'pos' : 'neg', sub: `${fmtVarPct(movOrcMes ? (movCatMes / movOrcMes - 1) * 100 : 0)} · ating. ${brNum(movAtingPct, 1)}%`, sub_cls: gapM >= 0 ? 'pos' : 'neg' },
        { lbl: `Pico ${capitalizar(ref.split('/')[0])} (${anoPicoM})`, val: `${brNum(picoM / 1000, 1)} kTON`, sub: `vs pico ${fmtVarPct((movCatMes / (picoM || 1) - 1) * 100)}` },
        { lbl: `${capitalizar(ref.split('/')[0])}/${anoAnt}`, val: `${brNum(movCatMesAA / 1000, 1)} kTON`, sub: 'ano anterior' },
        { lbl: 'Top Grupo (mês)', val: [...movGrupoMes.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? '—', sub: `${Math.round((([...movGrupoMes.entries()].sort((x, y) => y[1] - x[1])[0]?.[1] ?? 0) / (movCatMes || 1)) * 100)}% do mês` },
      ],
      callouts: [
        { tag: `Histórico de ${mesNomeRef}`, tag_cls: 'ctag-n', items: [
          { a: 'warn', t: `<strong>Pico em ${ref.split('/')[0]}/${anoPicoM}</strong> (${brNum(picoM / 1000, 1)} kTON)` },
        ] },
        { tag: 'Vs orçado — atenção', tag_cls: 'ctag-y', items: [
          { a: gapM >= 0 ? 'up' : 'down', t: `<strong>${fmtVarPct(movOrcMes ? (movCatMes / movOrcMes - 1) * 100 : 0)} vs orçado</strong> (${brNum(movOrcMes / 1000, 1)}k → gap ${gapM >= 0 ? '+' : MINUS}${brNum(Math.abs(gapM) / 1000, 1)}k) — atingimento de ${brNum(movAtingPct, 1)}%` },
        ] },
        { tag: 'Composição', tag_cls: 'ctag-n', items: [
          { a: 'up', t: `No mês: <strong>${[...movGrupoMes.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([g, v]) => `${g} ${Math.round((v / (movCatMes || 1)) * 100)}%`).join(', ')}</strong>` },
        ] },
      ],
      chart: {
        engine: 'group_stacked',
        y_max: Math.ceil((Math.max(picoM, totOrcM) * 1.15) / 50000) * 50000,
        unit: 'Ton',
        anos: [
          ...mesA.map(({ a, m }) => ({ lbl: String(a), isOrc: false, met: Math.round(m.met), der: Math.round(m.der), aq: Math.round(m.aq), ov: Math.round(m.ov), sc: Math.round(m.sc), out: Math.round(m.out) })),
          { lbl: `Orçado\\n${mesNomeRef}/${refAno}`, isOrc: true, met: Math.round(orcM.met), der: Math.round(orcM.der), aq: Math.round(orcM.aq), ov: Math.round(orcM.ov), sc: Math.round(orcM.sc), out: Math.round(orcM.out) },
        ],
      },
    };
    // slide 11 — previsão × realizado × orçado
    const temPrev = prevMov.some((r) => r.ano === refAno && r.mesN === refMes);
    if (!temPrev) {
      addPend('11', 'slide11_previsao', 'Previsão do mês não encontrada no Excel — mapear "Projeção - Ton Movimentação" ou informar via override.', 'warn');
    }
    const prevM = gk(somaPor(prevMov.filter((r) => r.ano === refAno && r.mesN === refMes), (r) => r.grupo, (r) => r.ton), false);
    const realM = gk(movGrupoMesAno(refAno), false);
    const orcM11 = gk(movOrcGrupoMes, false);
    const totPrev = prevM.met + prevM.der + prevM.aq + prevM.ov + prevM.sc + prevM.bio + prevM.out;
    const vsPrev = totPrev ? (movCatMes / totPrev - 1) * 100 : 0;
    D['slide11_previsao'] = {
      headline: `Realizado de ${mesNomeRef} (<span class="hl-pos">${brNum(movCatMes / 1000, 1)} kTON</span>) ${totPrev ? `${vsPrev >= 0 ? 'supera a previsão em' : 'fica abaixo da previsão em'} <span class="${vsPrev >= 0 ? 'hl-pos' : 'hl-neg'}">${fmtVarPct(vsPrev)}</span>` : 'sem previsão mapeada'} · <span class="${gapM >= 0 ? 'hl-pos' : 'hl-neg'}">${fmtVarPct(movOrcMes ? (movCatMes / movOrcMes - 1) * 100 : 0)} vs orçado</span>`,
      subhl: `Previsão vs. Realizado vs. Orçado · ${capitalizar(mesNomeRef)} ${refAno} · Movimentação por categoria de produto (TON)`,
      chart_lbl: `Previsão x Realizado x Orçado · ${capitalizar(mesNomeRef)} ${refAno} · por Categoria de Produto (TON)`,
      kpis: [
        { lbl: `Previsão ${capitalizar(ref.split('/')[0])}/${String(refAno).slice(2)}`, val: totPrev ? `${brNum(totPrev / 1000, 1)} kTON` : '—', sub: totPrev ? `${setaPct(movOrcMes ? (totPrev / movOrcMes - 1) * 100 : 0)} vs orçado` : 'não mapeada', sub_cls: 'neg' },
        { lbl: `Realizado ${capitalizar(ref.split('/')[0])}/${String(refAno).slice(2)}`, val: `${brNum(movCatMes / 1000, 1)} kTON`, val_cls: 'pos', sub: totPrev ? `${setaPct(vsPrev)} vs previsão` : 'mês fechado', sub_cls: vsPrev >= 0 ? 'pos' : 'neg' },
        { lbl: `Orçado ${capitalizar(ref.split('/')[0])}/${String(refAno).slice(2)}`, val: `${brNum(movOrcMes / 1000, 1)} kTON`, sub: 'meta do mês' },
        { lbl: 'Gap Real. vs Orç.', val: `${gapM >= 0 ? '+' : MINUS}${brNum(Math.abs(gapM) / 1000, 1)} kTON`, val_cls: gapM >= 0 ? 'pos' : 'neg', sub: `${fmtVarPct(movOrcMes ? (movCatMes / movOrcMes - 1) * 100 : 0)} · ating. ${brNum(movAtingPct, 1)}%`, sub_cls: gapM >= 0 ? 'pos' : 'neg' },
        { lbl: 'Real. vs Previsão', val: totPrev ? `${movCatMes - totPrev >= 0 ? '+' : MINUS}${brNum(Math.abs(movCatMes - totPrev) / 1000, 1)} kTON` : '—', val_cls: vsPrev >= 0 ? 'pos' : 'neg', sub: totPrev ? `${setaPct(vsPrev)} vs previsto` : 'não mapeada', sub_cls: vsPrev >= 0 ? 'pos' : 'neg' },
        { lbl: 'Maior desvio vs orç.', val: (() => { const difs = GRUPOS_ORDEM.map((g) => [g, (movGrupoMes.get(g) ?? 0) - (movOrcGrupoMes.get(g) ?? 0)] as [string, number]).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])); return difs[0] ? `${difs[0][1] >= 0 ? '+' : MINUS}${brNum(Math.abs(difs[0][1]) / 1000, 0)} kTON` : '—'; })(), val_cls: 'pos', sub: (() => { const difs = GRUPOS_ORDEM.map((g) => [g, (movGrupoMes.get(g) ?? 0) - (movOrcGrupoMes.get(g) ?? 0)] as [string, number]).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])); return difs[0]?.[0] ?? '—'; })() },
      ],
      callouts: [
        { tag: totPrev && vsPrev >= 0 ? 'Realizado superou previsão' : 'Previsão', tag_cls: 'ctag-n', items: [
          { a: vsPrev >= 0 ? 'up' : 'down', t: totPrev ? `<strong>${fmtVarPct(vsPrev)} vs previsão</strong> (${brNum(totPrev / 1000, 0)}k)` : 'Previsão não mapeada — informar via override se necessário' },
        ] },
        { tag: 'Vs Orçado — atenção', tag_cls: 'ctag-y', items: [
          { a: gapM >= 0 ? 'up' : 'down', t: `<strong>${fmtVarPct(movOrcMes ? (movCatMes / movOrcMes - 1) * 100 : 0)} vs orçado</strong> — atingimento de ${brNum(movAtingPct, 1)}%` },
        ] },
        { tag: 'Ação necessária', tag_cls: 'ctag-n', items: [
          { a: 'warn', t: 'Calibrar previsão e orçado para os próximos meses' },
        ] },
      ],
      chart: {
        engine: 'trio',
        y_max: Math.ceil((Math.max(movCatMes, movOrcMes, totPrev) * 1.1) / 50000) * 50000,
        bars: [
          { lbl: 'Previsão', kind: 'prev', met: Math.round(prevM.met), der: Math.round(prevM.der), aq: Math.round(prevM.aq), ov: Math.round(prevM.ov), sc: Math.round(prevM.sc), bio: Math.round(prevM.bio), out: Math.round(prevM.out) },
          { lbl: 'Realizado', kind: 'real', met: Math.round(realM.met), der: Math.round(realM.der), aq: Math.round(realM.aq), ov: Math.round(realM.ov), sc: Math.round(realM.sc), bio: Math.round(realM.bio), out: Math.round(realM.out) },
          { lbl: 'Orçado', kind: 'orc', met: Math.round(orcM11.met), der: Math.round(orcM11.der), aq: Math.round(orcM11.aq), ov: Math.round(orcM11.ov), sc: Math.round(orcM11.sc), bio: Math.round(orcM11.bio), out: Math.round(orcM11.out) },
        ],
      },
    };
  }

  // ---------- SLIDES 12/13 (market share) ----------
  const shareChart = (grupoFiltro: ((r: MovTRow) => boolean) | null, terminais: string[]) => {
    const meses = jan.labels;
    const totals: number[] = [];
    const dataPorTerm: Record<string, number[]> = Object.fromEntries(terminais.map((t) => [t, []]));
    for (const m of jan.meses) {
      const rows = movT.filter((r) => r.ano === m.ano && r.mesN === m.mesN && (!grupoFiltro || grupoFiltro(r)));
      const porTerm = somaPor(rows.filter((r) => terminais.includes(r.terminal)), (r) => r.terminal, (r) => r.ton);
      const tot = sum([...porTerm.values()]);
      totals.push(Math.round(sum(rows.map((r) => r.ton)) / 1000));
      // shares inteiros somando 100 (resto vai pro maior)
      const pcts = terminais.map((t) => (tot ? ((porTerm.get(t) ?? 0) / tot) * 100 : 0));
      const ints = pcts.map((p) => Math.floor(p));
      let resto = (tot ? 100 : 0) - sum(ints);
      const fracOrder = pcts.map((p, i) => [p - Math.floor(p), i] as [number, number]).sort((a, b) => b[0] - a[0]);
      for (const [, i] of fracOrder) { if (resto <= 0) break; ints[i]++; resto--; }
      terminais.forEach((t, i) => dataPorTerm[t].push(ints[i]));
    }
    // ordem de empilhamento de baixo pra cima como no manifesto: menores primeiro, Cattalini por último
    const ordem = [...terminais].sort((a, b) => sum(dataPorTerm[a]) - sum(dataPorTerm[b])).filter((t) => t !== 'Cattalini');
    ordem.push('Cattalini');
    return {
      engine: 'share',
      meses,
      totals,
      series: ordem.map((t) => ({ label: t, color: COR_TERMINAL[t].color, textColor: COR_TERMINAL[t].textColor, data: dataPorTerm[t] })),
    };
  };
  {
    const ch12 = shareChart(null, ['Cattalini', 'Transpetro', 'CBL', 'Terin']);
    const cat = ch12.series.find((s) => s.label === 'Cattalini')!.data;
    const tp = ch12.series.find((s) => s.label === 'Transpetro')!.data;
    const catRef = cat[12]; const catPrev = cat[11];
    const catMin = Math.min(...cat); const catMax = Math.max(...cat);
    const iMin = cat.indexOf(catMin); const iMax = cat.indexOf(catMax);
    const catYtd = (() => { const idx = jan.meses.map((m, i) => (m.ano === refAno ? i : -1)).filter((i) => i >= 0); return idx.length ? sum(idx.map((i) => cat[i])) / idx.length : 0; })();
    D['slide12_market_share'] = {
      headline: `Cattalini encerra ${mesNomeRef} em <span class="hl-warn">${catRef}%</span> — <span class="${catRef - catPrev >= 0 ? 'hl-pos' : 'hl-neg'}">${catRef - catPrev >= 0 ? '+' : MINUS}${Math.abs(catRef - catPrev)} p.p. vs ${jan.labels[11].split('/')[0]}</span> · Transpetro em ${tp[12]}%`,
      subhl: `${jan.janelaLabel} · Market share mensal por terminal · Granéis Líquidos Paranaguá (%/t)`,
      chart_lbl: `Market Share por Terminal (%/t) · ${jan.labels[0].replace('/', '/').toLowerCase()} → ${ref}`.replace(/^m/, 'M'),
      kpis: [
        { lbl: `Cattalini — ${ref}`, val: `${catRef}%`, val_color: '#10253F', sub: `${catRef - catPrev >= 0 ? '+' : MINUS}${Math.abs(catRef - catPrev)} p.p. vs ${jan.labels[11].split('/')[0]}`, bar: '#10253F' },
        { lbl: 'Cattalini — mín / máx', val: `${catMin}% / ${catMax}%`, val_color: '#10253F', sub: `${jan.labels[iMin]} · ${jan.labels[iMax]}`, bar: '#10253F;opacity:.35' },
        { lbl: `Transpetro — ${ref}`, val: `${tp[12]}%`, val_color: '#6C809A', sub: `de ${tp[11]}% em ${jan.labels[11].split('/')[0]}`, bar: '#6C809A' },
        { lbl: `CBL — ${ref}`, val: `${ch12.series.find((s) => s.label === 'CBL')!.data[12]}%`, val_color: '#C09000', sub: `de ${ch12.series.find((s) => s.label === 'CBL')!.data[11]}% em ${jan.labels[11].split('/')[0]}`, bar: '#FFC000' },
        { lbl: `Terin — ${ref}`, val: `${ch12.series.find((s) => s.label === 'Terin')!.data[12]}%`, val_color: '#6A8A30', sub: `de ${ch12.series.find((s) => s.label === 'Terin')!.data[11]}% em ${jan.labels[11].split('/')[0]}`, bar: '#9BBB59' },
        { lbl: `Cattalini — YTD Jan–${capitalizar(ref.split('/')[0])}/${String(refAno).slice(2)}`, val: `${brNum(catYtd, 1)}%`, val_color: '#10253F', sub: 'média do ano', bar: '#10253F' },
      ],
      callouts: [
        { tag: 'Cattalini', items: [
          { a: catRef >= catPrev ? 'up' : 'down', t: `<strong>${catRef}% em ${ref}</strong> — ${catRef - catPrev >= 0 ? '+' : MINUS}${Math.abs(catRef - catPrev)} p.p. vs ${jan.labels[11].split('/')[0]}` },
          { a: 'up', t: `<strong>YTD ${brNum(catYtd, 1)}%</strong> — média dos meses de ${refAno}` },
        ] },
        { tag: 'Concorrência', items: [
          { a: tp[12] <= tp[11] ? 'down' : 'up', t: `<strong>Transpetro ${tp[12]}%</strong> — ${tp[12] <= tp[11] ? 'recuo' : 'avanço'} vs ${jan.labels[11].split('/')[0]} (${tp[11]}%)` },
          { a: 'neu', t: `<strong>CBL ${ch12.series.find((s) => s.label === 'CBL')!.data[12]}%</strong> e <strong>Terin ${ch12.series.find((s) => s.label === 'Terin')!.data[12]}%</strong> no mês` },
        ] },
        { tag: 'Ação', items: [
          { a: 'up', t: 'Consolidar a captura de share com contratos de prazo' },
        ] },
      ],
      chart: ch12,
    };
    // slide 13 — MS Derivados SEM Transpetro (Regra 11)
    const ch13 = shareChart((r) => r.grupo === 'Derivados', ['Cattalini', 'CBL', 'Terin']);
    const cat13 = ch13.series.find((s) => s.label === 'Cattalini')!.data;
    const cbl13 = ch13.series.find((s) => s.label === 'CBL')!.data;
    const ter13 = ch13.series.find((s) => s.label === 'Terin')!.data;
    const med13 = sum(cat13) / cat13.length;
    D['slide13_ms_derivados'] = {
      headline: `Cattalini ${cat13[12] >= 50 ? 'mantém a liderança' : 'disputa a liderança'} em derivados com <span class="hl-warn">${cat13[12]}%</span> em ${mesNomeRef} — <span class="${cat13[12] - cat13[11] >= 0 ? 'hl-pos' : 'hl-neg'}">${cat13[12] - cat13[11] >= 0 ? '+' : MINUS}${Math.abs(cat13[12] - cat13[11])} p.p. vs ${jan.labels[11].split('/')[0]}</span> · CBL em ${cbl13[12]}% e Terin em ${ter13[12]}%`,
      subhl: `${jan.janelaLabel} · Market share de Derivados por terminal · sem Transpetro (Cattalini × CBL × Terin) · %/t`,
      chart_lbl: `Market Share — Derivados (%/t) · sem Transpetro · ${capitalizar(jan.labels[0])} → ${capitalizar(ref)}`,
      kpis: [
        { lbl: `Cattalini — ${ref}`, val: `${cat13[12]}%`, val_color: '#10253F', sub: `${cat13[12] - cat13[11] >= 0 ? '+' : MINUS}${Math.abs(cat13[12] - cat13[11])} p.p. vs ${jan.labels[11].split('/')[0]}`, bar: '#10253F' },
        { lbl: 'Cattalini — mín / máx', val: `${Math.min(...cat13)}% / ${Math.max(...cat13)}%`, val_color: '#10253F', sub: `${jan.labels[cat13.indexOf(Math.min(...cat13))]} · ${jan.labels[cat13.indexOf(Math.max(...cat13))]}`, bar: '#10253F;opacity:.35' },
        { lbl: `CBL — ${ref}`, val: `${cbl13[12]}%`, val_color: '#C09000', sub: `de ${cbl13[11]}% em ${jan.labels[11].split('/')[0]}`, bar: '#FFC000' },
        { lbl: `Terin — ${ref}`, val: `${ter13[12]}%`, val_color: '#6A8A30', sub: ter13[11] === 0 && ter13[12] > 0 ? `reaparece (0% em ${jan.labels[11].split('/')[0]})` : `de ${ter13[11]}% em ${jan.labels[11].split('/')[0]}`, bar: '#9BBB59' },
        { lbl: 'Cattalini — média', val: `${brNum(med13, 1)}%`, val_color: '#10253F', sub: 'share médio em derivados', bar: '#10253F' },
        { lbl: `Volume Derivados ${ref}`, val: `${ch13.totals[12]}k`, val_color: '#14204A', sub: 'TON (sem Transpetro)', bar: '#10253F;opacity:0' },
      ],
      callouts: [
        { tag: 'Cattalini', items: [
          { a: 'up', t: `<strong>${cat13[12]}% em ${ref.split('/')[0]}</strong> — share médio de ${brNum(med13, 1)}% no período` },
          ...(cat13[12] < cat13[11] ? [{ a: 'down', t: `Recuou <strong>${MINUS}${Math.abs(cat13[12] - cat13[11])} p.p. vs ${jan.labels[11].split('/')[0]}</strong> (${cat13[11]}%)` }] : []),
        ] },
        { tag: 'Concorrência', items: [
          { a: cbl13[12] >= cbl13[11] ? 'up' : 'down', t: `<strong>CBL ${cbl13[12]}%</strong> — principal concorrente em derivados` },
          { a: ter13[12] >= ter13[11] ? 'up' : 'down', t: `<strong>Terin ${ter13[12]}%</strong> — terminal volátil` },
        ] },
        { tag: 'Ação', items: [
          { a: 'warn', t: 'Reforçar contratos de derivados para defender o share' },
        ] },
      ],
      chart: ch13,
    };
  }

  // ---------- SLIDE 14 (soda) ----------
  {
    const volsK = jan.meses.map((m) =>
      Math.round(sum(movCat.filter((r) => r.ano === m.ano && r.mesN === m.mesN && r.grupo === 'Soda Cáustica').map((r) => r.ton)) / 1000));
    const outros = jan.meses.some((m) =>
      movT.some((r) => r.terminal !== 'Cattalini' && r.ano === m.ano && r.mesN === m.mesN && r.grupo === 'Soda Cáustica' && r.ton > 0));
    if (outros) addPend('14', 'slide14_soda', 'Outro terminal registrou Soda Cáustica na janela — conferir monopólio antes de publicar.', 'warn');
    const ytdK = sum(jan.meses.filter((m) => m.ano === refAno).map((m) =>
      sum(movCat.filter((r) => r.ano === m.ano && r.mesN === m.mesN && r.grupo === 'Soda Cáustica').map((r) => r.ton)))) / 1000;
    const minK = Math.min(...volsK); const maxK = Math.max(...volsK);
    D['slide14_soda'] = {
      labels: jan.labels,
      volumes: volsK,
      ytd_k: Math.round(ytdK * 10) / 10,
      min_k: minK,
      min_mes: jan.labels[volsK.indexOf(minK)],
      max_k: maxK,
      max_mes: jan.labels[volsK.indexOf(maxK)],
      meses_consecutivos: 13,
    };
  }

  // ---------- SLIDE 15 (óleo degomado) ----------
  {
    const isDeg = (p: string) => /DEGOM/i.test(p);
    const degYtd = movC.filter((r) => r.ano === refAno && isDeg(r.produto));
    const degAA = movC.filter((r) => r.ano === anoAnt && isDeg(r.produto));
    const ultimoMesC = degYtd.reduce((mx, r) => Math.max(mx, r.mesN), 0) || refMes;
    const degAAcomp = degAA.filter((r) => r.mesN <= ultimoMesC);
    const porCli = [...somaPor(degYtd, (r) => r.cliente, (r) => r.ton).entries()].sort((a, b) => b[1] - a[1]);
    const totalDeg = sum(porCli.map(([, v]) => v));
    const totalDegAA = sum(degAAcomp.map((r) => r.ton));
    const varAA = totalDegAA ? pctSafe(totalDeg, totalDegAA) : 0;
    const periodo = `Jan–${capitalizar(refLabel(ultimoMesC, refAno).split('/')[0])}/${refAno}`;
    const top3pct = totalDeg ? Math.round((sum(porCli.slice(0, 3).map(([, v]) => v)) / totalDeg) * 100) : 0;
    addPend('15', 'slide15_oleo_degomado', 'Faturamento por cliente do óleo degomado não está no Excel — informar via override (print Fat por cliente, mesmo período da Mov).', 'block');
    D['slide15_oleo_degomado'] = {
      headline: `${porCli[0]?.[0] ?? '—'} lidera volume com <span class="hl-up">${fmtK(porCli[0]?.[1] ?? 0)} TON</span> · exportação de óleo degomado ${varAA >= 0 ? 'cresce' : 'recua'} <span class="${varAA >= 0 ? 'hl-up' : 'hl-down'}">${fmtVarPct(varAA, 0)}</span> aa no volume`,
      hl_sub: `${periodo} · Óleo de Soja Degomado – Exportação · Movimentação (TON) por cliente · Faturamento via override`,
      kpis: [
        { lbl: `MOV. Total ${periodo}`, val: `${fmtK(totalDeg, 0)} TON`, val_cls: 'up', sub: totalDegAA ? `<span class="up">${varAA >= 0 ? '▲' : '▼'} ${fmtVarPct(varAA, 0)}</span> vs jan–${refLabel(ultimoMesC, anoAnt)}` : 'sem base ano anterior' },
        { lbl: `Fat. Total ${periodo}`, val: '—', sub: 'informar via override (print)' },
        { lbl: `Top Volume — ${porCli[0]?.[0] ?? '—'}`, val: `${fmtK(porCli[0]?.[1] ?? 0)} TON`, sub: `${brNum(totalDeg ? ((porCli[0]?.[1] ?? 0) / totalDeg) * 100 : 0, 1)}% do volume total` },
        { lbl: 'Top 3 concentram', val: `${top3pct}%`, sub: `volume (${porCli.slice(0, 3).map(([k]) => k).join(' + ')})` },
        { lbl: 'Clientes ativos', val: String(porCli.length), val_cls: 'up', sub: `${periodo} nesse produto` },
      ],
      sec_mov: `Movimentação por Cliente (TON) · ${periodo}`,
      sec_fat: `Faturamento por Cliente (R$ x 1.000) · ${periodo}`,
      mov_labels: porCli.slice(0, 16).map(([k]) => k),
      mov_vals: porCli.slice(0, 16).map(([, v]) => Math.round(v)),
      fat_labels: [],
      fat_vals: [],
      callouts_mov: [
        { tag: 'Concentração · Volume', items: [
          { a: 'warn', t: `<strong>${porCli.slice(0, 3).map(([k]) => k).join(' + ')} = ${top3pct}%</strong> do volume — top 3 concentrados` },
        ] },
        { tag: 'Destaque · Volume', items: (() => {
          const porCliAA = somaPor(degAAcomp, (r) => r.cliente, (r) => r.ton);
          const cresc = porCli.filter(([k, v]) => (porCliAA.get(k) ?? 0) > 0 && v > (porCliAA.get(k) ?? 0) * 1.5).slice(0, 2);
          return cresc.length ? cresc.map(([k, v]) => ({ a: 'up', t: `<strong>${k} ${fmtVarPct(pctSafe(v, somaPor(degAAcomp, (r) => r.cliente, (r) => r.ton).get(k) ?? 1), 0)} aa</strong> — crescimento expressivo em TON` })) : [{ a: 'neu', t: 'Sem crescimentos &gt;50% aa no período' }];
        })() },
        { tag: 'Atenção · Volume', items: (() => {
          const porCliAA = somaPor(degAAcomp, (r) => r.cliente, (r) => r.ton);
          const qued = porCli.filter(([k, v]) => (porCliAA.get(k) ?? 0) > 0 && v < (porCliAA.get(k) ?? 0) * 0.8).slice(0, 2);
          return qued.length ? qued.map(([k, v]) => ({ a: 'down', t: `<strong>${k} ${fmtVarPct(pctSafe(v, porCliAA.get(k) ?? 1), 1)}</strong> em TON — maior recuo do grupo` })) : [{ a: 'neu', t: 'Sem quedas relevantes em TON' }];
        })() },
      ],
      callouts_fat: [
        { tag: 'Concentração · Receita', items: [{ a: 'warn', t: '<strong>Informar faturamento via override</strong> — print Fat por cliente (mesmo período da Mov)' }] },
        { tag: 'Destaque · Receita', items: [{ a: 'neu', t: 'Preencher após o override de faturamento' }] },
        { tag: 'Atenção · Receita', items: [{ a: 'neu', t: 'Callouts de R$ só falam de R$ (Regra 10)' }] },
      ],
    };
  }

  // ---------- SLIDE 16 (transpetro) ----------
  {
    const PROD: [string, RegExp][] = [['die', /diesel/i], ['bun', /bunker/i], ['glp', /^glp/i], ['gas', /gasolina/i], ['naf', /nafta/i]];
    const data: Record<string, Record<string, number>> = {};
    for (const m of jan.meses) {
      const rows = movT.filter((r) => r.terminal === 'Transpetro' && r.ano === m.ano && r.mesN === m.mesN);
      const o: Record<string, number> = { die: 0, bun: 0, glp: 0, gas: 0, naf: 0 };
      for (const r of rows) {
        const hit = PROD.find(([, re]) => re.test(r.produto));
        if (hit) o[hit[0]] += r.ton / (DENS[hit[0]] ?? 1); // TON → m³
      }
      data[m.label] = Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)]));
    }
    const maxTot = Math.max(...jan.labels.map((l) => sum(Object.values(data[l]))));
    D['slide16_transpetro'] = {
      labels: jan.labels,
      data,
      y_max: Math.ceil((maxTot * 1.15) / 20000) * 20000,
    };
  }

  // ---------- SLIDE 18 (top meses) ----------
  {
    const volMes = new Map<string, number>();
    for (const r of movCat) volMes.set(`${r.ano}-${r.mesN}`, (volMes.get(`${r.ano}-${r.mesN}`) ?? 0) + r.ton);
    const fatMesTot = new Map<string, number>();
    for (const r of fat) fatMesTot.set(`${r.ano}-${r.mesN}`, (fatMesTot.get(`${r.ano}-${r.mesN}`) ?? 0) + r.valor);
    const nomeLongo = (k: string) => { const [a, m] = k.split('-').map(Number); return `${mesNome(m)}/${a}`; };
    const topVol = [...volMes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topFat = [...fatMesTot.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    D['slide18_top_meses'] = {
      volume: topVol.map(([k, v]) => [nomeLongo(k), `${fmtInt(v)} TON`]),
      faturamento: topFat.map(([k, v]) => [nomeLongo(k), fmtMi(v)]),
      recorde_vol_k: Math.round(topVol[0][1] / 1000),
      recorde_vol_mes: (() => { const [a, m] = topVol[0][0].split('-').map(Number); return refLabel(m, a); })(),
      fat_top1_mi: Math.round((topFat[0][1] / 1e6) * 10) / 10,
      fat_top2_mi: Math.round((topFat[1][1] / 1e6) * 10) / 10,
      pagina: 18,
    };
  }

  // ---------- SLIDE 01 (destaques — montado dos números do próprio deck) ----------
  {
    const k = D['kpis_gerais'];
    const cat12 = D['slide12_market_share'];
    const catRef = cat12 ? cat12.chart.series.find((s: any) => s.label === 'Cattalini').data[12] : 0;
    const catPrev = cat12 ? cat12.chart.series.find((s: any) => s.label === 'Cattalini').data[11] : 0;
    const grp = [...Object.entries(D['produtos_fat_mai_mi'] as Record<string, number>)];
    const varAAg = grp.map(([g]) => {
      const v = fatGrupoMes.get(g) ?? 0; const aa = fatGrupoMesAA.get(g) ?? 0;
      return [g, aa ? pctSafe(v, aa) : 0] as [string, number];
    });
    const melhoresAA = [...varAAg].sort((a, b) => b[1] - a[1]);
    const pioresAA = [...varAAg].sort((a, b) => a[1] - b[1]);
    const bullet = (main: string, subs: string[]) =>
      `<div class="bullet-group">\n        <div class="b-main"><span class="b-dot"></span><span class="b-text">${main}</span></div>\n        <div class="sub-bullets">\n          ` +
      subs.map((s) => `<div class="sub-b"><span class="sub-dash">–</span><span class="sub-text">${s}</span></div>`).join('\n          ') +
      '\n        </div>\n      </div>';
    D['slide01_destaques'] = {
      tokens: { MES_ANO: `${capitalizar(mesNomeRef)} ${refAno}`, MES_CURTO: ref },
      bullets: [
        bullet(
          `<strong>Faturamento de ${fmtMi(k.fat_real_mi * 1e6)}</strong> — <span class="hi">${fmtVarPct(k.fat_aa_pct)} aa</span>, ${k.ating_pct >= 100 ? `<span class="hi">+${brNum(k.ating_pct - 100, 1)}% vs orçado</span>` : `<span class="warn">${MINUS}${brNum(100 - k.ating_pct, 1)}% vs orçado</span>`}`,
          [
            `YTD Jan–${capitalizar(ref.split('/')[0])} acumula <strong>${fmtMi(k.fat_ytd_mi * 1e6)}</strong> (<span class="hi">${fmtVarPct(k.fat_ytd_aa_pct)} vs ${anoAnt}</span>)`,
            `Movimentação ${fmtK(k.mov_real_ton, 0)} TON — ${k.mov_ating_pct >= 100 ? `<span class="hi">+${brNum(k.mov_ating_pct - 100, 1)}%</span>` : `<span class="warn">${MINUS}${brNum(100 - k.mov_ating_pct, 1)}%</span>`} vs orçado`,
          ],
        ),
        bullet(
          `<strong>Market share Cattalini em ${catRef}% no mês</strong> — <span class="hi">${catRef - catPrev >= 0 ? '+' : MINUS}${Math.abs(catRef - catPrev)} p.p. vs mês anterior</span>`,
          [
            `Transpetro em <span class="warn">${cat12 ? cat12.chart.series.find((s: any) => s.label === 'Transpetro').data[12] : 0}%</span> — acompanhar movimento da concorrência`,
            `${D['slide03_carteira_fat'].tokens.CLI_ATIVOS} clientes ativos no mês — base em acompanhamento`,
          ],
        ),
        bullet(
          `<strong>${melhoresAA[0][0]} e ${melhoresAA[1]?.[0] ?? ''} sustentam o crescimento</strong> — ${melhoresAA[0][0]} <span class="hi">${fmtVarPct(melhoresAA[0][1])} aa</span>${melhoresAA[1] ? ` e ${melhoresAA[1][0]} <span class="hi">${fmtVarPct(melhoresAA[1][1])} aa</span>` : ''}`,
          [
            `Take or Pay representa <strong>${k.take_or_pay_pct}%</strong> da receita — base recorrente e previsível`,
            `Contratos &gt;12 meses = <strong>${k.contratos_12m_pct}%</strong> do faturamento YTD`,
          ],
        ),
        bullet(
          `<strong>Atenção — ${pioresAA[0][0]} pressiona</strong> — <span class="warn">${fmtVarPct(pioresAA[0][1])} aa</span>${pioresAA[1] && pioresAA[1][1] < 0 ? ` e ${pioresAA[1][0]} <span class="warn">${fmtVarPct(pioresAA[1][1])} aa</span>` : ''}`,
          [
            `Concentração: Cattalini (${catRef}%) + Transpetro (${cat12 ? cat12.chart.series.find((s: any) => s.label === 'Transpetro').data[12] : 0}%) somam <strong>${catRef + (cat12 ? cat12.chart.series.find((s: any) => s.label === 'Transpetro').data[12] : 0)}% do volume</strong> de Paranaguá`,
            `Ticket médio YTD <strong>R$ ${brNum(k.ticket_ton, 2)}/TON</strong>`,
          ],
        ),
      ],
    };
  }

  // ---------- validações (equivalente ao --check) ----------
  {
    if (jan.labels.length !== 13) valid.push({ slide: 'meta', msg: 'Janela não tem 13 meses', severidade: 'error' });
    for (const nn of ['12', '13'] as const) {
      const ch = D[nn === '12' ? 'slide12_market_share' : 'slide13_ms_derivados']?.chart;
      if (ch) {
        ch.meses.forEach((m: string, i: number) => {
          const s = sum(ch.series.map((sr: any) => sr.data[i]));
          if (s !== 100 && s !== 0) valid.push({ slide: nn, msg: `Shares de ${m} somam ${s}% (≠100%)`, severidade: 'error' });
          if (s === 0) valid.push({ slide: nn, msg: `Sem dado de share em ${m}`, severidade: 'warn' });
        });
      }
    }
    const s02 = D['slide02_faturamento'];
    if (s02?.rows?.length) {
      const somaMi = sum(s02.rows.map((r: any[]) => parseFloat(String(r[2]).replace('R$', '').replace('Mi', '').replace(',', '.'))));
      const totMi = parseFloat(String(s02.total[0]).replace('R$', '').replace('Mi', '').replace(',', '.'));
      if (Math.abs(somaMi - totMi) > 0.3) valid.push({ slide: '02', msg: `Linhas somam R$${somaMi.toFixed(1)}Mi ≠ total R$${totMi.toFixed(1)}Mi`, severidade: 'error' });
    }
    if (!D['slide15_oleo_degomado'].fat_vals.length) {
      valid.push({ slide: '15', msg: 'Faturamento do óleo degomado vazio — resolver override', severidade: 'warn' });
    }
    // outlier de espaço m³ (mês fora da banda vs mediana 12M → possível duplicação na base)
    {
      const tot8: number[] = D['slide08_espaco_m3'].chart.totals;
      const ord = [...tot8].sort((a, b) => a - b);
      const mediana = ord[Math.floor(ord.length / 2)] || 1;
      tot8.forEach((v, i) => {
        if (v > mediana * 1.4 || v < mediana * 0.6) {
          valid.push({ slide: '08', msg: `Espaço de ${D['slide08_espaco_m3'].chart.months[i]} (${Math.round(v).toLocaleString('pt-BR')} m³) foge da banda dos 12M — conferir base/override`, severidade: 'warn' });
        }
      });
    }
    if (fatOrcMes <= 0) valid.push({ slide: '02', msg: 'Sem orçamento do mês — variações vs orçado zeradas', severidade: 'error' });
  }

  return { manifesto: D, pendencias: pend, validacoes: valid };
}
