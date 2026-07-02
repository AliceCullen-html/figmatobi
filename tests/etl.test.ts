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

function load(file: string) {
  const buf = readFileSync(file);
  return parseWorkbook(file, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

describe('ETL sobre o Excel real', () => {
  const sheets = [
    ...load('Consolidado_Fat.Mes_a_Mes_por_produto_e_grupo_Realizado.xlsx'),
    ...load('Consolidado_Fat.Mes_a_Mes_por_produto_e_grupo_orcamento.xlsx'),
  ];
  const cfg = autoDetect(sheets);

  it('auto-detecta os datasets principais', () => {
    expect(cfg.datasets.fat_realizado?.sheet).toBe('Banco de Dados - Faturamento');
    expect(cfg.datasets.mov_terminal?.sheet).toBe('Mov - Realizada');
    expect(cfg.datasets.mov_cliente?.sheet).toBe('Mov - Realizada(Cliente)');
    expect(cfg.datasets.fat_orcado?.sheet).toBe('Banco de Dados - Fat.');
    expect(cfg.datasets.mov_orcada?.sheet).toBe('Mov - Orçada');
  });

  const { manifesto, pendencias, validacoes } = buildManifest(sheets, cfg);

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

  it('campos sem fonte confiável viram pendência (nunca valor cru)', () => {
    expect(pendencias.some((p) => p.slide === '15')).toBe(true);
    expect(manifesto.slide15_oleo_degomado.fat_vals).toEqual([]);
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
});
