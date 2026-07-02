/** Modo SVG (Figma): gráficos viram vetor nativo e nenhum script sobra. */
import { describe, it, expect } from 'vitest';
import D from '../report-bi/references/dados_mes.json';
import { renderDeck } from '../src/engine/engine';
import { toSvgMode } from '../src/charts/svg';

const COM_CANVAS = ['05', '06', '09', '10', '11', '12', '13', '14', '15', '16'];

describe('modo SVG (editável no Figma)', () => {
  const deck = renderDeck(D as Record<string, unknown>);

  it('substitui canvas por SVG e remove scripts', () => {
    for (const s of deck) {
      const svg = toSvgMode(s.html, s.nn, D as Record<string, unknown>);
      if (COM_CANVAS.includes(s.nn)) {
        expect(svg, `slide ${s.nn}`).toContain('<svg');
        expect(svg, `slide ${s.nn}`).not.toContain('<canvas');
        expect(svg, `slide ${s.nn}`).not.toContain('<script');
      } else {
        expect(svg, `slide ${s.nn}`).toBe(s.html); // já é vetorial
      }
    }
  });

  it('barra Orçado transparente (Regra 3): fill cor+55 e borda 1.5', () => {
    const s09 = deck.find((s) => s.nn === '09')!;
    const svg = toSvgMode(s09.html, '09', D as Record<string, unknown>);
    expect(svg).toMatch(/fill="#00B05055" stroke="#00B050" stroke-width="1.5"/);
  });

  it('cores fixas por grupo e terminal (Regras 4/5)', () => {
    const svg12 = toSvgMode(deck.find((s) => s.nn === '12')!.html, '12', D as Record<string, unknown>);
    for (const cor of ['#10253F', '#6C809A', '#FFC000', '#9BBB59']) expect(svg12).toContain(cor);
    const svg05 = toSvgMode(deck.find((s) => s.nn === '05')!.html, '05', D as Record<string, unknown>);
    expect(svg05).toContain('#00B050');
    expect(svg05).toContain('#14204A');
  });

  it('donut mantém raio e rótulo central do original', () => {
    const svg05 = toSvgMode(deck.find((s) => s.nn === '05')!.html, '05', D as Record<string, unknown>);
    expect(svg05).toContain('viewBox="0 0 190 190"');
    expect(svg05).toContain('R$67,9Mi');
    expect(svg05).toContain('FAT. MAI/26');
  });
});
