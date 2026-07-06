/**
 * Teste do ETL com o Excel REAL de exemplo: auto-detecção de abas,
 * construção do manifesto e render dos 17 slides sem erro.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseWorkbook } from '../src/etl/excel';
import { autoDetect } from '../src/etl/mapping';
import { buildManifest } from '../src/etl/etl';
import { renderDeck, ORDER } from '../src/engine/engine';

async function load(file: string) {
  const buf = readFileSync(file);
  return parseWorkbook(file, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

// top-level await: xlsx é carregado sob demanda (parseWorkbook agora é async)
const sheets = [
  ...(await load('Consolidado_Fat.Mes_a_Mes_por_produto_e_grupo_Realizado.xlsx')),
  ...(await load('Consolidado_Fat.Mes_a_Mes_por_produto_e_grupo_orcamento.xlsx')),
];
const cfg = autoDetect(sheets);
const { manifesto, pendencias, validacoes } = buildManifest(sheets, cfg);

describe('ETL sobre o Excel real', () => {
  it('auto-detecta os datasets principais', () => {
    expect(cfg.datasets.fat_realizado?.sheet).toBe('Banco de Dados - Faturamento');
    expect(cfg.datasets.mov_terminal?.sheet).toBe('Mov - Realizada');
    expect(cfg.datasets.mov_cliente?.sheet).toBe('Mov - Realizada(Cliente)');
    expect(cfg.datasets.fat_orcado?.sheet).toBe('Banco de Dados - Fat.');
    expect(cfg.datasets.mov_orcada?.sheet).toBe('Mov - Orçada');
  });

  it('identifica o mês de referência (mai/26)', () => {
    expect(manifesto.meta.ref).toBe('mai/26');
    expect(manifesto.meta.nav_corrente).toEqual(['jan/26', 'fev/26', 'mar/26', 'abr/26', 'mai/26']);
  });

  it('KPIs batem com os valores conhecidos do Excel', () => {
    expect(manifesto.kpis_gerais.mov_real_ton).toBe(473320);
    expect(manifesto.kpis_gerais.fat_real_mi).toBeGreaterThan(60);
    expect(manifesto.kpis_gerais.fat_real_mi).toBeLessThan(75);
  });

  it('janela tem 13 meses e shares somam 100', () => {
    expect(manifesto.slide14_soda.labels).toHaveLength(13);
    const ch = manifesto.slide12_market_share.chart;
    for (let i = 0; i < 13; i++) {
      const s = ch.series.reduce((a: number, sr: any) => a + sr.data[i], 0);
      expect(s).toBe(100);
    }
  });

  it('MS Derivados sem Transpetro (Regra 11)', () => {
    const labels = manifesto.slide13_ms_derivados.chart.series.map((s: any) => s.label);
    expect(labels).not.toContain('Transpetro');
    expect(labels.sort()).toEqual(['CBL', 'Cattalini', 'Terin']);
  });

  it('fat do degomado vem do produto OLEO DE SOJA BRUTO, com pendência de conferência', () => {
    const s15 = manifesto.slide15_oleo_degomado;
    expect(s15.fat_vals.length).toBeGreaterThan(5);
    // valores validados contra o deck oficial de mai/26 (R$ x1.000)
    const ldc = s15.fat_labels.indexOf('LDC');
    expect(ldc).toBeGreaterThanOrEqual(0);
    expect(s15.fat_vals[ldc]).toBe(8632);
    // Regra 10: callouts de receita não mencionam TON
    for (const c of s15.callouts_fat) {
      for (const it of c.items) expect(it.t).not.toMatch(/TON/);
    }
    expect(pendencias.some((p) => p.slide === '15' && p.severidade === 'warn')).toBe(true);
  });

  it('renderiza os 17 slides sem erro', () => {
    const deck = renderDeck(manifesto);
    expect(deck).toHaveLength(ORDER.length);
    for (const s of deck) {
      expect(s.html).toContain('<div class="slide">');
      expect(s.html).not.toContain('%%');
      expect(s.html).not.toContain('undefined');
      expect(s.html).not.toContain('NaN');
    }
  });

  it('validações não acusam erro grave', () => {
    const erros = validacoes.filter((v) => v.severidade === 'error');
    expect(erros).toEqual([]);
  });

  it('espaço m³ sem duplicação de serviços (mai/26 ≈ 846k, não 2,6M)', () => {
    const tot = manifesto.slide08_espaco_m3.chart.totals;
    const mai = tot[tot.length - 1];
    expect(mai).toBeGreaterThan(800_000);
    expect(mai).toBeLessThan(900_000);
    // nenhum mês pode estourar o eixo do template (1M)
    for (const v of tot) expect(v).toBeLessThan(1_000_000);
  });
});

describe('JSONs do Power BI como fonte alternativa', () => {
  it('resumo-bi.json vira aba de terminais e alimenta o market share', async () => {
    const { parseBiJson } = await import('../src/etl/excel');
    const txt = readFileSync('exemplos-bi-json/resumo-bi.json', 'utf-8');
    const sheets = parseBiJson('resumo-bi.json', txt);
    expect(sheets[0].sheet).toBe('BI · Terminais (mensal)');
    expect(sheets[0].rows.length).toBeGreaterThan(400); // 96 meses × 6 terminais
    const cat = sheets[0].rows.find((r) => r['TERMINAL'] === 'Cattalini' && r['ANO'] === '2026' && r['MêsNum'] === 5);
    expect(Math.round(Number(cat?.['Mov (TON)']))).toBe(473320);
  });
});
