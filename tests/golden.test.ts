/**
 * TESTE GOLDEN-MASTER (seção 9 do prompt).
 *
 * Os arquivos em golden/ foram gerados rodando o gerar.py ORIGINAL (Python)
 * sobre report-bi/references/dados_mes.json. A engine TypeScript, alimentada
 * com o MESMO manifesto, deve produzir HTML idêntico byte a byte.
 * Qualquer divergência é bug do porte — nunca "melhoria".
 */
import { describe, it, expect } from 'vitest';
import D from '../report-bi/references/dados_mes.json';
import { renderDeck, ORDER } from '../src/engine/engine';

import g01 from '../golden/slide_01_destaques.html?raw';
import g02 from '../golden/slide_02_faturamento.html?raw';
import g03 from '../golden/slide_03_carteira_fat.html?raw';
import g04 from '../golden/slide_04_carteira_mov.html?raw';
import g05 from '../golden/slide_05_abc_produto.html?raw';
import g06 from '../golden/slide_06_abc_cliente.html?raw';
import g07 from '../golden/slide_07_receita_servico.html?raw';
import g08 from '../golden/slide_08_espaco_m3.html?raw';
import g09 from '../golden/slide_09_mov_acumulada.html?raw';
import g10 from '../golden/slide_10_mov_historico.html?raw';
import g11 from '../golden/slide_11_previsao.html?raw';
import g12 from '../golden/slide_12_market_share.html?raw';
import g13 from '../golden/slide_13_ms_derivados.html?raw';
import g14 from '../golden/slide_14_ms_soda_caustica.html?raw';
import g15 from '../golden/slide_15_oleo_degomado.html?raw';
import g16 from '../golden/slide_16_transpetro_mov.html?raw';
import g18 from '../golden/slide_18_top_meses.html?raw';

const GOLDEN: Record<string, string> = {
  '01': g01, '02': g02, '03': g03, '04': g04, '05': g05, '06': g06,
  '07': g07, '08': g08, '09': g09, '10': g10, '11': g11, '12': g12,
  '13': g13, '14': g14, '15': g15, '16': g16, '18': g18,
};

describe('golden-master: engine TS reproduz gerar.py byte a byte', () => {
  const results = renderDeck(D as Record<string, unknown>);
  for (const nn of ORDER) {
    it(`slide ${nn}`, () => {
      const r = results.find((x) => x.nn === nn)!;
      expect(r.html).toBe(GOLDEN[nn]);
    });
  }
});
