/**
 * Modo SVG (default, alvo do Figma): substitui os gráficos Chart.js/canvas
 * por SVG nativo — cada fatia/barra vira <path>/<rect> editável no
 * html.to.design. Fidelidade às Regras de Ouro:
 *  - cores fixas por grupo/terminal (Regras 4/5)
 *  - barra "Orçado" transparente: fill cor+'55', borda cor, 1.5px (Regra 3)
 *  - trio Realizado sólido · Previsão cor+'B3' · Orçado cor+'55'+borda
 *  - janela 13 meses com destaque do ano corrente (Regra 7)
 * O modo Chart.js (saída canônica do gerar.py) permanece como fallback.
 */

type Manifest = Record<string, any>;

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ptBR = (n: number) => Math.round(n).toLocaleString('pt-BR');

const GRUPO6 = [
  { key: 'met', label: 'Metanol', color: '#00B050', tc: '#fff' },
  { key: 'der', label: 'Derivados', color: '#14204A', tc: '#fff' },
  { key: 'aq', label: 'Aquecidos', color: '#8A9BB0', tc: '#fff' },
  { key: 'ov', label: 'Óleo Vegetal', color: '#F5C400', tc: '#7a5500' },
  { key: 'sc', label: 'Soda Cáustica', color: '#C8D4DF', tc: '#4a5568' },
  { key: 'out', label: 'Outros', color: '#5A82B5', tc: '#fff' },
];
const GRUPO7 = [
  ...GRUPO6.slice(0, 5),
  { key: 'bio', label: 'Biocombustíveis', color: '#F0A33A', tc: '#7a4a00' },
  GRUPO6[5],
];
const TRANSP5 = [
  { key: 'die', label: 'Diesel', color: '#14204A', tc: '#fff' },
  { key: 'bun', label: 'Bunker', color: '#F5C400', tc: '#7a5500' },
  { key: 'glp', label: 'GLP', color: '#6C809A', tc: '#fff' },
  { key: 'gas', label: 'Gasolina', color: '#8A9BB0', tc: '#fff' },
  { key: 'naf', label: 'Nafta', color: '#D6DEE8', tc: '#64748b' },
];

function text(x: number, y: number, s: string, opts: { size?: number; weight?: number; fill?: string; anchor?: string; baseline?: string } = {}): string {
  const { size = 10, weight = 500, fill = '#14204A', anchor = 'middle', baseline = 'auto' } = opts;
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="Inter, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${baseline !== 'auto' ? ` dominant-baseline="${baseline}"` : ''}>${esc(s)}</text>`;
}

function gridY(W: number, H: number, padT: number, padB: number, padL: number, padR: number, yMax: number, fmt: (v: number) => string, nTicks = 5): string {
  let out = '';
  const ih = H - padT - padB;
  for (let i = 0; i <= nTicks; i++) {
    const v = (yMax / nTicks) * i;
    const y = H - padB - (v / yMax) * ih;
    out += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="rgba(148,163,184,.15)" stroke-width="1"/>`;
    out += text(padL - 6, y + 3, fmt(v), { size: 9, weight: 600, fill: '#94a3b8', anchor: 'end' });
  }
  return out;
}

/** Barras verticais empilhadas (slides 09/10/11/16). */
function svgStacked(opts: {
  W: number; H: number;
  bars: { lbl: string; vals: number[]; style: 'solid' | 'prev' | 'orc'; lblBold?: boolean }[];
  series: { label: string; color: string; tc: string }[];
  yMax: number;
  totalFmt: (t: number) => string;
  segFmt: (v: number) => string;
  minSegPx?: number;
}): string {
  const { W, H, bars, series, yMax, totalFmt, segFmt, minSegPx = 15 } = opts;
  const padT = 26; const padB = 34; const padL = 46; const padR = 8;
  const ih = H - padT - padB;
  const iw = W - padL - padR;
  const slot = iw / bars.length;
  const bw = Math.min(slot * 0.62, 120);
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
  out += gridY(W, H, padT, padB, padL, padR, yMax, (v) => (v ? (v / 1000).toFixed(0) + 'k' : '0'));
  bars.forEach((b, i) => {
    const cx = padL + slot * i + slot / 2;
    let y = H - padB;
    const total = b.vals.reduce((a, v) => a + v, 0);
    b.vals.forEach((v, si) => {
      if (v <= 0) return;
      const h = (v / yMax) * ih;
      y -= h;
      const s = series[si];
      let fill = s.color; let stroke = ''; let fo = '';
      if (b.style === 'prev') fill = s.color + 'B3';
      if (b.style === 'orc') { fill = s.color + '55'; stroke = ` stroke="${s.color}" stroke-width="1.5"`; fo = ''; }
      out += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}"${stroke}${fo}/>`;
      if (h >= minSegPx) out += text(cx, y + h / 2 + 3, segFmt(v), { size: 9, weight: 500, fill: b.style === 'orc' ? s.color : s.tc });
      return;
    });
    out += text(cx, y - 7, totalFmt(total), { size: 10, weight: b.style === 'solid' ? 700 : 500, fill: b.style === 'solid' ? '#14204A' : '#64748b' });
    // rótulo do eixo X (suporta \n)
    const linhas = b.lbl.split('\\n');
    linhas.forEach((l, li) => {
      out += text(cx, H - padB + 14 + li * 11, l, { size: 10.5, weight: b.lblBold ? 700 : 500, fill: b.lblBold ? '#14204A' : '#8B92A9' });
    });
  });
  out += '</svg>';
  return out;
}

/** Share 100% empilhado (slides 12/13). */
function svgShare(ch: any, nav: string[]): string {
  const W = 1040; const H = 420;
  const padT = 22; const padB = 30; const padL = 40; const padR = 8;
  const ih = H - padT - padB;
  const iw = W - padL - padR;
  const n = ch.meses.length;
  const slot = iw / n;
  const bw = slot * 0.66;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
  out += gridY(W, H, padT, padB, padL, padR, 100, (v) => v + '%', 4);
  for (let i = 0; i < n; i++) {
    const cx = padL + slot * i + slot / 2;
    let y = H - padB;
    for (const s of ch.series) {
      const v = s.data[i];
      if (!v) continue;
      const h = (v / 100) * ih;
      y -= h;
      out += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${s.color}"/>`;
      if (v >= 6) out += text(cx, y + h / 2 + 4, v + '%', { size: 11, weight: 700, fill: s.textColor });
    }
    if (ch.totals[i]) out += text(cx, y - 6, ch.totals[i] + ' k', { size: 10, weight: 600, fill: '#64748b' });
    const emNav = nav.includes(ch.meses[i]);
    out += text(cx, H - padB + 15, ch.meses[i], { size: 10.5, weight: emNav ? 700 : 500, fill: emNav ? '#14204A' : '#8B92A9' });
  }
  out += '</svg>';
  return out;
}

/** Soda (slide 14): colunas 100% com volume acima. */
function svgSoda(labels: string[], vols: number[], nav: string[]): string {
  const W = 1040; const H = 420;
  const padT = 30; const padB = 30; const padL = 40; const padR = 8;
  const ih = H - padT - padB;
  const iw = W - padL - padR;
  const slot = iw / labels.length;
  const bw = slot * 0.66;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
  out += gridY(W, H, padT, padB, padL, padR, 110, (v) => v + '%', 5);
  labels.forEach((l, i) => {
    const cx = padL + slot * i + slot / 2;
    const h = (100 / 110) * ih;
    const y = H - padB - h;
    const emNav = nav.includes(l);
    out += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${emNav ? '#10253F' : '#10253F99'}"/>`;
    out += text(cx, y - 8, `${vols[i]} K`, { size: 10, weight: 600, fill: '#14204A' });
    out += text(cx, y + h / 2 + 4, '100', { size: 12, weight: 700, fill: '#fff' });
    out += text(cx, H - padB + 15, l, { size: 11, weight: emNav ? 700 : 500, fill: emNav ? '#14204A' : '#8B92A9' });
  });
  out += '</svg>';
  return out;
}

/** Barras horizontais (slide 15). */
function svgHBars(labels: string[], vals: number[], color: string, kind: 'mov' | 'fat'): string {
  const W = 380; const H = 470;
  const padL = 92; const padR = 56; const padT = 4; const padB = 4;
  const n = Math.max(labels.length, 1);
  const ih = H - padT - padB;
  const rowH = ih / n;
  const bh = Math.min(rowH * 0.62, 18);
  const maxV = Math.max(...vals, 1);
  const iw = W - padL - padR;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
  labels.forEach((l, i) => {
    const cy = padT + rowH * i + rowH / 2;
    const w = (vals[i] / maxV) * iw;
    out += text(padL - 6, cy + 3, l.length > 14 ? l.slice(0, 13) + '…' : l, { size: 9, weight: 500, fill: '#64748b', anchor: 'end' });
    out += `<rect x="${padL}" y="${(cy - bh / 2).toFixed(1)}" width="${Math.max(w, 1).toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${i < 3 ? color : color + 'AA'}"/>`;
    const v = vals[i];
    const txt = kind === 'mov'
      ? (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v))
      : 'R$' + (v >= 1000 ? (v / 1000).toFixed(2) + 'Mi' : v + 'k');
    out += text(padL + w + 5, cy + 3, txt, { size: 9, weight: 600, fill: '#14204A', anchor: 'start' });
  });
  out += '</svg>';
  return out;
}

/** Donut ABC (slides 05/06) — mesmo raio/rotulagem do canvas original. */
function svgDonut(segs: [string, number, string][], center: [string, string]): string {
  const cx = 95; const cy = 95; const R = 88; const r = 56;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 190" width="190" height="190">`;
  let start = -Math.PI / 2;
  const total = segs.reduce((a, [, p]) => a + p, 0) || 100;
  for (const [label, pct, color] of segs) {
    const sw = (pct / total) * 2 * Math.PI;
    const end = start + sw;
    const large = sw > Math.PI ? 1 : 0;
    const x1 = cx + R * Math.cos(start); const y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end); const y2 = cy + R * Math.sin(end);
    const x3 = cx + r * Math.cos(end); const y3 = cy + r * Math.sin(end);
    const x4 = cx + r * Math.cos(start); const y4 = cy + r * Math.sin(start);
    out += `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z" fill="${color}"><title>${esc(label)}: ${pct}%</title></path>`;
    start = end;
  }
  out += text(cx, cy - 4, center[0], { size: 16, weight: 700, fill: '#14204A' });
  out += text(cx, cy + 14, center[1], { size: 9, weight: 500, fill: '#8B92A9' });
  out += '</svg>';
  return out;
}

function stripScripts(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>\s*/g, '');
}

function swapCanvas(html: string, canvasId: string, svg: string): string {
  return html.replace(new RegExp(`<canvas id="${canvasId}"[^>]*>\\s*(</canvas>)?`), svg);
}

/**
 * Converte o HTML canônico (Chart.js) de um slide para o modo SVG-Figma.
 * Slides sem canvas (01–04, 07, 08, 18) voltam intactos (já são vetoriais).
 */
export function toSvgMode(html: string, nn: string, D: Manifest): string {
  const NAV: string[] = D.meta?.nav_corrente ?? [];
  switch (nn) {
    case '05': case '06': {
      const s = D[nn === '05' ? 'slide05_abc_produto' : 'slide06_abc_cliente'];
      html = swapCanvas(html, 'donut', svgDonut(s.segs, s.donut_center));
      return stripScripts(html);
    }
    case '09': case '10': {
      const s = D[nn === '09' ? 'slide09_mov_acumulado' : 'slide10_mov_maio'];
      const ch = s.chart;
      const svg = svgStacked({
        W: 1040, H: 420,
        bars: ch.anos.map((a: any) => ({
          lbl: a.lbl,
          vals: GRUPO6.map((g) => a[g.key] ?? 0),
          style: a.isOrc ? 'orc' : 'solid',
          lblBold: !a.isOrc,
        })),
        series: GRUPO6.map((g) => ({ label: g.label, color: g.color, tc: g.tc })),
        yMax: ch.y_max,
        totalFmt: (t) => ptBR(t) + ' Ton',
        segFmt: (v) => (v / 1000).toFixed(0) + 'k',
      });
      return stripScripts(swapCanvas(html, 'rc', svg));
    }
    case '11': {
      const ch = D.slide11_previsao.chart;
      const svg = svgStacked({
        W: 1040, H: 420,
        bars: ch.bars.map((b: any) => ({
          lbl: b.lbl,
          vals: GRUPO7.map((g) => b[g.key] ?? 0),
          style: b.kind === 'real' ? 'solid' : b.kind === 'prev' ? 'prev' : 'orc',
          lblBold: b.kind === 'real',
        })),
        series: GRUPO7.map((g) => ({ label: g.label, color: g.color, tc: g.tc })),
        yMax: ch.y_max,
        totalFmt: (t) => ptBR(t) + ' Ton',
        segFmt: (v) => (v / 1000).toFixed(0) + 'k',
      });
      return stripScripts(swapCanvas(html, 'rc', svg));
    }
    case '12': case '13': {
      const ch = D[nn === '12' ? 'slide12_market_share' : 'slide13_ms_derivados'].chart;
      return stripScripts(swapCanvas(html, 'rc', svgShare(ch, NAV)));
    }
    case '14': {
      const s = D.slide14_soda;
      return stripScripts(swapCanvas(html, 'rc', svgSoda(s.labels, s.volumes, NAV)));
    }
    case '15': {
      const s = D.slide15_oleo_degomado;
      html = swapCanvas(html, 'mov', svgHBars(s.mov_labels, s.mov_vals, '#14204A', 'mov'));
      html = swapCanvas(html, 'fat', svgHBars(s.fat_labels, s.fat_vals, '#F5C400', 'fat'));
      return stripScripts(html);
    }
    case '16': {
      const s = D.slide16_transpetro;
      const svg = svgStacked({
        W: 1040, H: 420,
        bars: s.labels.map((l: string) => ({
          lbl: l,
          vals: TRANSP5.map((p) => s.data[l]?.[p.key] ?? 0),
          style: 'solid',
          lblBold: NAV.includes(l),
        })),
        series: TRANSP5.map((p) => ({ label: p.label, color: p.color, tc: p.tc })),
        yMax: s.y_max,
        totalFmt: (t) => (t / 1000).toFixed(0) + 'k',
        segFmt: (v) => (v / 1000).toFixed(0) + 'k',
        minSegPx: 16,
      });
      return stripScripts(swapCanvas(html, 'rc', svg));
    }
    default:
      return html; // 01–04, 07, 08, 18: sem canvas — já são HTML/CSS vetorial
  }
}
