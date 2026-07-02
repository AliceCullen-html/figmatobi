/**
 * PORTE FIEL de report-bi/gerar.py para TypeScript.
 * Cada função espelha a função homônima do Python, linha a linha.
 * A saída deve ser BYTE A BYTE idêntica aos golden files gerados pelo
 * gerar.py original (teste golden-master em tests/golden.test.ts).
 *
 * NÃO "melhorar" nada aqui: qualquer divergência de estrutura/estilo
 * em relação ao gerar.py é bug do porte.
 */
import {
  br, kfmt, jsList, pyRound, pyRoundDigits, pyFloatRepr, pyNumStr,
  intComma, pyCapitalize3, pyD, reSub, replaceAll,
} from './pyfmt';
import { TEMPLATES, SODA_TMPL, TRANSP_TMPL, TOP_TMPL } from './templates';

// f-string do Python sobre valor vindo do manifesto (str | int | float)
function fstr(x: unknown): string {
  if (typeof x === 'number') return pyNumStr(x);
  return String(x);
}

export interface RenderResult {
  nn: string;
  file: string;
  html: string;
}

type Manifest = Record<string, any>;

// ============================================================ SLIDE 14 — SODA
function genSoda(D: Manifest): RenderResult {
  const META = D['meta'];
  const NAV: string[] = META['nav_corrente'];
  const s = D['slide14_soda'];
  const labels: string[] = s['labels'];
  const vols: number[] = s['volumes'];
  const ref: string = META['ref'];
  const volMai = vols[vols.length - 1];
  const prevMes = labels[labels.length - 2];
  const prevVol = vols[vols.length - 2];
  const direc = volMai >= prevVol ? 'recupera vs' : 'recua vs';
  let HTML = SODA_TMPL;
  const rep: [string, string][] = [
    ['__JANELA__', META['janela_label']],
    ['__REF__', ref],
    ['__CONS__', fstr(s['meses_consecutivos'])],
    ['__VOLMAI__', `${fstr(volMai)} K TON`],
    ['__YTD__', br(s['ytd_k'], 1) + 'k TON'],
    ['__MINK__', `${fstr(s['min_k'])} K TON`],
    ['__MINMES__', s['min_mes']],
    ['__MAXK__', `${fstr(s['max_k'])} K TON`],
    ['__MAXMES__', s['max_mes']],
    ['__SECLBL__', META['janela_label'].split('/2025').join('/25').split('/2026').join('/26')],
    ['__DIREC__', `${fstr(volMai)}k TON em ${ref} — ${direc} ${prevMes} (${fstr(prevVol)}k)`],
    ['__LABELS__', jsList(labels)],
    ['__VOLS__', jsList(vols, false)],
    ['__NAV__', jsList(NAV)],
  ];
  for (const [k, v] of rep) HTML = replaceAll(HTML, k, v);
  return { nn: '14', file: 'slide_14_ms_soda_caustica.html', html: HTML };
}

// ====================================================== SLIDE 16 — TRANSPETRO
const PRODNAME: Record<string, string> = {
  die: 'Diesel', bun: 'Bunker', glp: 'GLP', gas: 'Gasolina', naf: 'Nafta',
};
function genTranspetro(D: Manifest): RenderResult {
  const META = D['meta'];
  const NAV: string[] = META['nav_corrente'];
  const s = D['slide16_transpetro'];
  const labels: string[] = s['labels'];
  const data: Record<string, Record<string, number>> = s['data'];
  const ref: string = META['ref'];
  const m = data[ref];
  const total = Object.values(m).reduce((a, b) => a + b, 0);
  const pct = (v: number) => pyRound((v / total) * 100);
  // produto lider do mes (max mantém o primeiro em caso de empate, como no Python)
  let lead = 'die';
  for (const k of ['die', 'bun', 'glp', 'gas']) {
    if (m[k] > m[lead]) lead = k;
  }
  const prev = data[labels[labels.length - 2]];
  const prevTot = Object.values(prev).reduce((a, b) => a + b, 0);
  // data block JS
  const rows: string[] = [];
  for (const l of labels) {
    const dd = data[l];
    rows.push(
      `  { lbl:'${l}', die:${pyD(dd['die'])}, bun:${pyD(dd['bun'])}, glp:${pyD(dd['glp'])}, gas:${pyD(dd['gas'])}, naf:${pyD(dd['naf'])} }`,
    );
  }
  const dataJs = '[\n' + rows.join(',\n') + ',\n]';
  let HTML = TRANSP_TMPL;
  const rep: [string, string][] = [
    ['__JANELA__', META['janela_label']],
    ['__REF__', ref],
    ['__SECLBL__', META['janela_label'].split('/2025').join('/25').split('/2026').join('/26')],
    ['__LEAD__', PRODNAME[lead]],
    ['__LEADV__', kfmt(m[lead]) + ' m³'],
    ['__LEADPCT__', String(pct(m[lead]))],
    ['__TOTAL__', kfmt(total) + ' m³'],
    ['__TOTPREV__', kfmt(prevTot)],
    ['__DIE__', kfmt(m['die']) + ' m³'],
    ['__DIEP__', String(pct(m['die']))],
    ['__BUN__', kfmt(m['bun']) + ' m³'],
    ['__BUNP__', String(pct(m['bun']))],
    ['__GAS__', kfmt(m['gas']) + ' m³'],
    ['__GASP__', String(pct(m['gas']))],
    ['__GLP__', kfmt(m['glp']) + ' m³'],
    ['__GLPP__', String(pct(m['glp']))],
    ['__NAF__', m['naf'] ? kfmt(m['naf']) + ' m³' : '0 m³'],
    ['__LABELS__', jsList(labels)],
    ['__NAV__', jsList(NAV)],
    ['__DATA__', dataJs],
    ['__YMAX__', fstr(s['y_max'])],
  ];
  for (const [k, v] of rep) HTML = replaceAll(HTML, k, v);
  return { nn: '16', file: 'slide_16_transpetro_mov.html', html: HTML };
}

// ====================================================== SLIDE 18 — TOP MESES
function _rows(lst: [string, string][]): string {
  const medal = ['🥇', '🥈', '🥉'];
  const out: string[] = [];
  lst.forEach(([mes, val], i) => {
    let rk: string, mc: string;
    if (i < 3) {
      rk = `<span class="medal">${medal[i]}</span>`;
      mc = 'mes b';
    } else {
      rk = `<span class="rnum">#${i + 1}</span>`;
      mc = 'mes';
    }
    out.push(`<tr><td class="rk">${rk}</td><td class="${mc}">${mes}</td><td class="val">${val}</td></tr>`);
  });
  return out.join('\n          ');
}

function genTopMeses(D: Manifest): RenderResult {
  const META = D['meta'];
  const s = D['slide18_top_meses'];
  const fat1Mes = s['faturamento'][0][0];
  const fat1Val = s['faturamento'][0][1];
  const pct2o = br((s['fat_top1_mi'] / s['fat_top2_mi'] - 1) * 100, 1);
  const movRefK = D['kpis_gerais']['mov_real_ton'] / 1000;
  const gap = pyRound((s['recorde_vol_k'] / movRefK - 1) * 100);
  let HTML = TOP_TMPL;
  const rep: [string, string][] = [
    ['__FAT1MES__', fat1Mes],
    ['__FAT1VAL__', fat1Val],
    ['__PCT2O__', pct2o],
    ['__RECVOL__', fstr(s['recorde_vol_k'])],
    ['__RECMES__', s['recorde_vol_mes']],
    ['__GAP__', String(gap)],
    ['__REFVOL__', `${pyRound(movRefK)}k`],
    ['__REF__', META['ref']],
    ['__ROWS_VOL__', _rows(s['volume'])],
    ['__ROWS_FAT__', _rows(s['faturamento'])],
    ['__PG__', fstr(s['pagina'])],
  ];
  for (const [k, v] of rep) HTML = replaceAll(HTML, k, v);
  return { nn: '18', file: 'slide_18_top_meses.html', html: HTML };
}

// ============================================== MOTOR CHART SLIDES (09-13)
const ARROW: Record<string, [string, string]> = {
  up: ['arr-up', '↑'], down: ['arr-down', '↓'], warn: ['arr-warn', '→'], neu: ['arr-neu', '→'],
};

function buildKpis(kpis: any[]): string {
  const out: string[] = [];
  for (const k of kpis) {
    const bar = k['bar'] ? `<div class="kpi-bar" style="background:${k['bar']}"></div>` : '';
    const vcls = k['val_cls'] ? ' ' + k['val_cls'] : '';
    const vsty = k['val_color'] ? ` style="color:${k['val_color']}"` : '';
    const scls = k['sub_cls'] ? ' ' + k['sub_cls'] : '';
    out.push(
      `<div class="kpi">${bar}<div class="kpi-lbl">${k['lbl']}</div>` +
      `<div class="kpi-val${vcls}"${vsty}>${k['val']}</div>` +
      `<div class="kpi-sub${scls}">${k['sub']}</div></div>`,
    );
  }
  return '<div class="kpis">\n    ' + out.join('\n    ') + '\n  </div>';
}

function buildSidecol(callouts: any[]): string {
  const secs: string[] = [];
  for (const c of callouts) {
    const tcls = c['tag_cls'] ? ' ' + c['tag_cls'] : '';
    const items: string[] = [];
    for (const it of c['items']) {
      const [acls, ach] = ARROW[it['a']];
      items.push(
        `<div class="c-item"><span class="arr ${acls}">${ach}</span>` +
        `<span class="c-text">${it['t']}</span></div>`,
      );
    }
    secs.push(
      `<div class="ctag${tcls}">${c['tag']}</div>\n      ` +
      `<div class="c-items">\n        ` + items.join('\n        ') + '\n      </div>',
    );
  }
  const inner = secs.join('\n      <div class="crule"></div>\n      ');
  return '<div class="side-col">\n      ' + inner + '\n    </div>';
}

function buildChartJs(ch: any): [RegExp, string][] {
  const eng = ch['engine'];
  if (eng === 'group_stacked') {
    const rows = ch['anos'].map((a: any) =>
      `  { lbl:'${a['lbl']}', isOrc:${a['isOrc'] ? 'true' : 'false'}, met:${pyD(a['met'])}, der:${pyD(a['der'])}, aq:${pyD(a['aq'])}, ov:${pyD(a['ov'])}, sc:${pyD(a['sc'])}, out:${pyD(a['out'])} }`,
    );
    return [[/const anos = \[.*?\];/s, 'const anos = [\n' + rows.join(',\n') + ',\n];']];
  }
  if (eng === 'trio') {
    const rows = ch['bars'].map((b: any) =>
      `  { lbl:'${b['lbl']}', kind:'${b['kind']}', met:${pyD(b['met'])}, der:${pyD(b['der'])}, aq:${pyD(b['aq'])}, ov:${pyD(b['ov'])}, sc:${pyD(b['sc'])}, bio:${pyD(b['bio'])}, out:${pyD(b['out'])} }`,
    );
    return [[/const bars = \[.*?\];/s, 'const bars = [\n' + rows.join(',\n') + ',\n];']];
  }
  if (eng === 'share') {
    const meses = 'const meses = [' + ch['meses'].map((m: string) => `"${m}"`).join(', ') + '];';
    const totals = 'const totals = [' + ch['totals'].map((t: number) => pyNumStr(t)).join(',') + '];';
    const srows = ch['series'].map((s: any) =>
      `  { label:'${s['label']}', color:'${s['color']}', textColor:'${s['textColor']}', data:[${s['data'].map((x: number) => pyNumStr(x)).join(',')}] }`,
    );
    const series = 'const SERIES = [\n' + srows.join(',\n') + ',\n];';
    return [
      [/const meses = \[.*?\];/s, meses],
      [/const totals = \[.*?\];/s, totals],
      [/const SERIES = \[.*?\];/s, series],
    ];
  }
  return [];
}

function renderChartSlide(D: Manifest, nn: string, key: string, fname: string): RenderResult {
  const s = D[key];
  let html = TEMPLATES[nn];
  html = reSub(html, /<div class="headline">.*?<\/div>/s,
    '<div class="headline">\n    ' + s['headline'] + '\n  </div>');
  html = reSub(html, /<div class="subhl">.*?<\/div>/s,
    '<div class="subhl">' + s['subhl'] + '</div>');
  if (s['chart_lbl']) {
    html = reSub(html, /<div class="chart-lbl">.*?<\/div>/s,
      '<div class="chart-lbl">' + s['chart_lbl'] + '</div>');
  }
  html = reSub(html, /<div class="kpis">.*?<\/div>\s*<div class="body-grid">/s,
    buildKpis(s['kpis']) + '\n\n  <div class="body-grid">');
  html = html.replace(
    /<div class="side-col">.*?<\/div>\s*<\/div>(\s*<div class="footer">|\s*<\/div>\s*<script)/s,
    (...args) => buildSidecol(s['callouts']) + '\n  </div>' + args[1],
  );
  for (const [pat, rep] of buildChartJs(s['chart'])) {
    html = reSub(html, pat, rep);
  }
  return { nn, file: fname, html };
}

// ============================================== SLIDE 02 (faturamento)
function _kpis02(kpis: any[]): string {
  const out: string[] = [];
  for (const k of kpis) {
    const vs = k['vcolor'] ? ` style="color:${k['vcolor']}"` : '';
    const d1c = k['d1c'] ? ' ' + k['d1c'] : '';
    const d2c = k['d2c'] ? ' ' + k['d2c'] : '';
    const d2s = k['d2color'] ? ` style="color:${k['d2color']}"` : '';
    out.push(
      `<div class="kpi"><div class="kpi-lbl">${k['lbl']}</div>` +
      `<div class="kpi-val big"${vs}>${k['val']}</div>` +
      `<div class="kpi-d1${d1c}">${k['d1']}</div>` +
      `<div class="kpi-d2${d2c}"${d2s}>${k['d2']}</div></div>`,
    );
  }
  return '<div class="kpis">\n    ' + out.join('\n    ') + '\n  </div>';
}

const BADGE: Record<string, string> = { A: 'ba', B: 'bb', C: 'bc' };

function genSlide02(D: Manifest): RenderResult {
  const s = D['slide02_faturamento'];
  let html = TEMPLATES['02'];
  html = reSub(html, /<div class="headline">.*?<\/div>/s,
    '<div class="headline">\n    ' + s['headline'] + '\n  </div>');
  html = reSub(html, /<div class="subhl">.*?<\/div>/s,
    '<div class="subhl">' + s['subhl'] + '</div>');
  html = reSub(html, /<div class="kpis">.*?<\/div>\s*<div class="body-grid">/s,
    _kpis02(s['kpis']) + '\n\n  <div class="body-grid">');
  const tr: string[] = [];
  for (const r of s['rows']) {
    const [grp, abc, fr, fo, vf, vfc, toR, tnO, vm, vmc] = r;
    tr.push(
      `<tr>\n            <td class="tl">${grp}</td>\n            <td style="text-align:center"><span class="badge ${BADGE[abc]}">${abc}</span></td>\n` +
      `            <td>${fr}</td>\n            <td class="muted">${fo}</td>\n            <td class="${vfc}">${vf}</td>\n` +
      `            <td>${toR}</td>\n            <td class="muted">${tnO}</td>\n            <td class="${vmc}">${vm}</td>\n          </tr>`,
    );
  }
  const [fr, fo, vf, vfc, tnR, tnO, vm, vmc] = s['total'];
  const tot =
    `<tr class="total-row">\n            <td class="tl bold">Total</td>\n            <td style="text-align:center">–</td>\n` +
    `            <td class="bold">${fr}</td>\n            <td class="bold muted">${fo}</td>\n            <td class="bold ${vfc}">${vf}</td>\n` +
    `            <td class="bold">${tnR}</td>\n            <td class="bold muted">${tnO}</td>\n            <td class="bold ${vmc}">${vm}</td>\n          </tr>`;
  const tbody = '<tbody>\n          ' + tr.join('\n          ') + '\n          ' + tot + '\n        </tbody>';
  html = reSub(html, /<tbody>.*?<\/tbody>/s, tbody);
  const a = s['ajudou'].map((t: string) =>
    `<div class="c-item">\n            <span class="arr arr-up">↑</span>\n            <span class="c-text">${t}</span>\n          </div>`,
  ).join('\n          ');
  const pp = s['pressionou'].map(([c, t]: [string, string]) =>
    `<div class="c-item">\n            <span class="arr ${ARROW[c][0]}">${ARROW[c][1]}</span>\n            <span class="c-text">${t}</span>\n          </div>`,
  ).join('\n          ');
  const sidecol =
    '<div class="side-col">\n' +
    '      <div class="callout-block">\n        <div class="ctag ctag-n">O que ajudou</div>\n        <div class="c-items">\n          ' + a + '\n        </div>\n      </div>\n\n' +
    '      <div class="crule"></div>\n\n' +
    '      <div class="callout-block">\n        <div class="ctag ctag-n">O que pressionou</div>\n        <div class="c-items">\n          ' + pp + '\n        </div>\n      </div>\n    </div>';
  html = reSub(html, /<div class="side-col">.*?<\/div>\s*<\/div>\s*<div class="footer">/s,
    sidecol + '\n  </div>\n\n  <div class="footer">');
  for (const [k, v] of Object.entries(s['tokens'] as Record<string, string>)) {
    html = replaceAll(html, `%%${k}%%`, v);
  }
  return { nn: '02', file: 'slide_02_faturamento.html', html };
}

// ============================================== SLIDE 03 (tabela cliente fat)
function genSlide03(D: Manifest): RenderResult {
  const s = D['slide03_carteira_fat'];
  let html = TEMPLATES['03'];
  html = reSub(html, /<div class="headline">.*?<\/div>/s,
    '<div class="headline">\n    ' + s['headline'] + '\n  </div>');
  html = reSub(html, /<div class="kpis">.*?<\/div>\s*<div class="body-grid">/s,
    buildKpis(s['kpis']) + '\n\n  <div class="body-grid">');
  const rows: string[] = [];
  for (const r of s['rows']) {
    const [rank, name, cls, grp, bw, fat, part, varr, vc] = r;
    rows.push(
      `<tr>\n            <td class="rank">${fstr(rank)}</td><td class="tl">${name}</td>\n` +
      `            <td style="text-align:center"><span class="badge ${BADGE[cls]}">${cls}</span></td><td class="grp">${grp}</td>\n` +
      `            <td class="bar-wrap"><div class="bar-track"><div class="bar-fill" style="width:${fstr(bw)}%"></div></div></td>\n` +
      `            <td class="num">${fat}</td><td class="muted">${part}</td><td class="${vc}">${varr}</td>\n          </tr>`,
    );
  }
  const tot =
    `<tr class="total-row">\n            <td></td><td class="tl bold">Top 10</td><td></td><td></td><td></td>\n` +
    `            <td class="bold">${s['total'][0]}</td><td class="bold">${s['total'][1]}</td><td></td>\n          </tr>`;
  const tbody = '<tbody>\n          ' + rows.join('\n          ') + '\n          ' + tot + '\n        </tbody>';
  html = reSub(html, /<tbody>.*?<\/tbody>/s, tbody);
  // side-col: 3 blocos ctag + prioridades
  const blocks: string[] = [];
  for (const c of s['sidecol']) {
    const items = c['items'].map((it: any) =>
      `<div class="c-item">\n            <span class="arr ${ARROW[it['a']][0]}">${ARROW[it['a']][1]}</span>\n            <span class="c-text">${it['t']}</span>\n          </div>`,
    ).join('\n          ');
    blocks.push(`<div>\n        <div class="ctag ${c['cls']}">${c['tag']}</div>\n        <div class="c-items">\n          ${items}\n        </div>\n      </div>`);
  }
  const priors = s['prioridades'].map((t: string, i: number) =>
    `<div class="prior-item">\n            <div class="prior-num">${i + 1}</div>\n            <div class="prior-text">${t}</div>\n          </div>`,
  ).join('\n          ');
  blocks.push(`<div>\n        <div class="ctag ctag-n">Prioridades de Ação</div>\n        <div class="prior-list">\n          ${priors}\n        </div>\n      </div>`);
  const sidecol = '<div class="side-col">\n      ' + blocks.join('\n\n      <div class="crule"></div>\n\n      ') + '\n    </div>';
  html = reSub(html, /<div class="side-col">.*?<\/div>\s*<\/div>\s*<div class="footer">/s,
    sidecol + '\n  </div>\n\n  <div class="footer">');
  for (const [k, v] of Object.entries(s['tokens'] as Record<string, string>)) {
    html = replaceAll(html, `%%${k}%%`, v);
  }
  return { nn: '03', file: 'slide_03_carteira_fat.html', html };
}

// ============================================== HELPERS (04-08,01)
function buildKpisMs(kpis: any[]): string {
  const out: string[] = [];
  for (const k of kpis) {
    let vs = '';
    if (k['vcolor']) vs = ` style="color:${k['vcolor']}"`;
    else if (k['vsize']) vs = ` style="font-size:${k['vsize']}"`;
    const vc = k['vcls'] ? ' ' + k['vcls'] : '';
    const subs = k['subs'].map(([t, c]: [string, string]) =>
      `<div class="kpi-sub${c ? ' ' + c : ''}">${t}</div>`,
    ).join('');
    out.push(`<div class="kpi"><div class="kpi-lbl">${k['lbl']}</div><div class="kpi-val${vc}"${vs}>${k['val']}</div>${subs}</div>`);
  }
  return '<div class="kpis">\n    ' + out.join('\n    ') + '\n  </div>';
}

function buildSidecolPrior(sidecol: any[], prioridades: string[]): string {
  const blocks: string[] = [];
  for (const c of sidecol) {
    const items = c['items'].map((it: any) =>
      `<div class="c-item">\n            <span class="arr ${ARROW[it['a']][0]}">${ARROW[it['a']][1]}</span>\n            <span class="c-text">${it['t']}</span>\n          </div>`,
    ).join('\n          ');
    blocks.push(`<div>\n        <div class="ctag ${c['cls']}">${c['tag']}</div>\n        <div class="c-items">\n          ${items}\n        </div>\n      </div>`);
  }
  const pr = prioridades.map((t: string, i: number) =>
    `<div class="prior-item">\n            <div class="prior-num">${i + 1}</div>\n            <div class="prior-text">${t}</div>\n          </div>`,
  ).join('\n          ');
  blocks.push(`<div>\n        <div class="ctag ctag-n">Prioridades de Ação</div>\n        <div class="prior-list">\n          ${pr}\n        </div>\n      </div>`);
  return '<div class="side-col">\n      ' + blocks.join('\n\n      <div class="crule"></div>\n\n      ') + '\n    </div>';
}

function buildCssbars(ch: any): string {
  const sp: number[] = ch['split'];
  const co: string[] = ch['colors'];
  const am: number = ch['axis_max'];
  const bars: string[] = [];
  for (const tot of ch['totals'] as number[]) {
    const h = pyFloatRepr(pyRoundDigits((tot / am) * 100, 1));
    const segs = sp.map((p, i) => `<div class="seg" style="height:${fstr(p)}%;background:${co[i]}"></div>`).join('');
    const bv = intComma(tot).split(',').join('.');
    bars.push(`<div class="bcol"><div class="bar" style="height:${h}%"><div class="bval">${bv}</div><div class="segs">${segs}</div></div></div>`);
  }
  return bars.join('\n        ');
}

function buildAbcCards(cards: any[]): string {
  const out: string[] = [];
  cards.forEach((card, i) => {
    const [cc, dot, lbl, val, sub] = card;
    out.push(`<div class="abc-card ${cc}"><div class="ac-lbl"><span class="ac-dot dot-${dot}"></span><span class="ac-txt txt-${dot}">${lbl}</span></div><div class="ac-val">${val}</div><div class="ac-sub">${sub}</div></div>`);
    if (i === 2) out.push('<div class="sep-v"></div>');
  });
  return '<div class="abc-strip">\n    ' + out.join('\n    ') + '\n  </div>';
}

function buildSegs(segs: [string, number, string][]): string {
  const rows = segs.map(([l, p, c]) => `{ label:'${l}', pct:${pyD(p)}, color:'${c}' }`).join(',\n  ');
  return 'const segs = [\n  ' + rows + ',\n];';
}

function _donut(html: string, segs: [string, number, string][], center: [string, string]): string {
  html = reSub(html, /const segs = \[.*?\];/s, buildSegs(segs));
  html = html.replace(/(ctx\.fillText\(')[^']*(',cx,cy-9\);)/, (...a) => a[1] + center[0] + a[2]);
  html = html.replace(/(ctx\.fillText\(')[^']*(',cx,cy\+\d+\);)/, (...a) => a[1] + center[1] + a[2]);
  return html;
}

// ============================================== SLIDE 04 (tabela mov cliente)
function genSlide04(D: Manifest): RenderResult {
  const s = D['slide04_carteira_mov'];
  let html = TEMPLATES['04'];
  html = reSub(html, /<div class="headline">.*?<\/div>/s,
    '<div class="headline">\n    ' + s['headline'] + '\n  </div>');
  html = reSub(html, /<div class="subhl">.*?<\/div>/s,
    '<div class="subhl">' + s['subhl'] + '</div>');
  html = reSub(html, /<div class="kpis">.*?<\/div>\s*<div class="body-grid">/s,
    buildKpisMs(s['kpis']) + '\n\n  <div class="body-grid">');
  const rows: string[] = [];
  for (const r of s['rows']) {
    const [rk, nm, grp, cls, bw, v26, v25, varr, vc] = r;
    rows.push(`<tr>\n            <td class="rank">${fstr(rk)}</td>\n            <td class="tl">${nm}</td>\n            <td class="grp">${grp}</td>\n            <td style="text-align:center"><span class="badge ${BADGE[cls]}">${cls}</span></td>\n            <td class="bar-wrap"><div class="bar-track"><div class="bar-fill" style="width:${fstr(bw)}%;background:#14204A"></div></div></td>\n            <td class="num">${v26}</td>\n            <td class="muted">${v25}</td>\n            <td class="${vc}">${varr}</td>\n          </tr>`);
  }
  html = reSub(html, /<tbody>.*?<\/tbody>/s,
    '<tbody>\n          ' + rows.join('\n          ') + '\n        </tbody>');
  html = reSub(html, /<div class="side-col">.*?<\/div>\s*<\/div>\s*<div class="footer">/s,
    buildSidecolPrior(s['sidecol'], s['prioridades']) + '\n  </div>\n\n  <div class="footer">');
  for (const [k, v] of Object.entries(s['tokens'] as Record<string, string>)) {
    html = replaceAll(html, `%%${k}%%`, v);
  }
  return { nn: '04', file: 'slide_04_carteira_mov.html', html };
}

// ============================================== SLIDE 05 (ABC produto)
function genSlide05(D: Manifest): RenderResult {
  const s = D['slide05_abc_produto'];
  let html = TEMPLATES['05'];
  const head = `<div class="headline">\n    <div class="hl-main">\n      ${s['headline']}\n    </div>\n    <div class="hl-sub">${s['hl_sub']}</div>\n  </div>\n\n  ` + buildAbcCards(s['cards']);
  html = reSub(html, /<div class="headline">.*?<div class="abc-strip">.*?<\/div>\s*<div class="body">/s,
    head + '\n\n  <div class="body">');
  const rows: string[] = [];
  for (const [abc, nm, col, w, lbl, acum, orc, aa] of s['pareto']) {
    const fill = lbl ? `<span class="p-fill-lbl">${lbl}</span>` : '';
    rows.push(`<div class="p-row">\n          <div class="p-lbl"><span class="abc-b2 b${String(abc).toLowerCase()}">${abc}</span>${nm}</div>\n          <div class="p-outer"><div class="p-fill ${col}" style="width:${fstr(w)}%">${fill}</div></div>\n          <div class="p-acum">${acum}</div><div class="p-orc ${orc[1]}">${orc[0]}</div><div class="p-aa ${aa[1]}">${aa[0]}</div>\n        </div>`);
  }
  html = reSub(html, /<div class="pareto-rows">.*?<\/div>\s*<\/div>\s*<div class="right">/s,
    '<div class="pareto-rows">\n        ' + rows.join('\n        ') + '\n      </div>\n    </div>\n\n    <div class="right">');
  const co: string[] = [];
  for (const c of s['callouts']) {
    const items = c['items'].map((it: any) =>
      `<div class="c-item"><span class="arr ${ARROW[it['a']][0]}">${ARROW[it['a']][1]}</span><span class="c-text">${it['t']}</span></div>`,
    ).join('');
    co.push(`<div>\n        <div class="callout-tag">${c['tag']}</div>\n        <div class="c-items">${items}</div>\n      </div>`);
  }
  const right = '<div class="right">\n      ' + co.join('\n      <div class="rule"></div>\n      ') + '\n    </div>';
  html = reSub(html, /<div class="right">.*?<\/div>\s*<\/div>\s*<\/div>\s*<script/s,
    right + '\n  </div>\n</div>\n\n<script');
  html = _donut(html, s['segs'], s['donut_center']);
  html = reSub(html, /<div class="donut-title">.*?<\/div>/,
    '<div class="donut-title">' + s['donut_title'] + '</div>');
  return { nn: '05', file: 'slide_05_abc_produto.html', html };
}

// ============================================== SLIDE 06 (ABC cliente)
function genSlide06(D: Manifest): RenderResult {
  const META = D['meta'];
  const s = D['slide06_abc_cliente'];
  let html = TEMPLATES['06'];
  const head = `<div class="headline">\n    <div class="hl-main">\n      ${s['headline']}\n    </div>\n    <div class="hl-sub">${s['hl_sub']}</div>\n  </div>\n\n  ` + buildAbcCards(s['cards']);
  html = reSub(html, /<div class="headline">.*?<div class="abc-strip">.*?<\/div>\s*<div class="body">/s,
    head + '\n\n  <div class="body">');
  const blocks: string[] = [];
  for (const nv of s['niveis']) {
    const pills = nv['pills'].map(([nm, isn]: [string, boolean]) =>
      `<span class="pill pill-${nv['badge']}">${nm}${isn ? ' <span class="pill-new">novo</span>' : ''}</span>`,
    ).join('\n          ');
    blocks.push(`<div class="nivel-block">\n        <div class="nivel-header">\n          <span class="nivel-badge badge-${nv['badge']}">${String(nv['badge']).toUpperCase()}</span>\n          <span class="nivel-label">${nv['label']}</span>\n          <span class="nivel-meta">${nv['meta']}</span>\n        </div>\n        <div class="pills">\n          ${pills}\n        </div>\n      </div>`);
  }
  const seclbl = `${pyCapitalize3(META['mes'])}/${fstr(META['ano'])}`;
  const nivelcol = '<div class="nivel-col">\n      <div class="sec-label">Distribuição por Nível — ' + seclbl + '</div>\n      ' + blocks.join('\n      <div class="divider"></div>\n      ') + '\n    </div>';
  html = reSub(html, /<div class="nivel-col">.*?<\/div>\s*<div class="right">/s,
    nivelcol + '\n\n    <div class="right">');
  const co: string[] = [];
  for (const c of s['callouts']) {
    const items = c['items'].map((it: any) =>
      `<div class="c-item"><span class="arr ${ARROW[it['a']][0]}">${ARROW[it['a']][1]}</span><span class="c-text">${it['t']}</span></div>`,
    ).join('');
    co.push(`<div>\n        <div class="callout-tag">${c['tag']}</div>\n        <div class="c-items">${items}</div>\n      </div>`);
  }
  const right = '<div class="right">\n      ' + co.join('\n      <div class="rule"></div>\n      ') + '\n    </div>';
  html = reSub(html, /<div class="right">.*?<\/div>\s*<\/div>\s*<\/div>\s*<script/s,
    right + '\n  </div>\n</div>\n\n<script');
  html = _donut(html, s['segs'], s['donut_center']);
  html = reSub(html, /<div class="donut-title">.*?<\/div>/,
    '<div class="donut-title">' + s['donut_title'] + '</div>');
  return { nn: '06', file: 'slide_06_abc_cliente.html', html };
}

// ============================================== SLIDE 07/08 (barras CSS)
function genBarsSlide(D: Manifest, nn: string, key: string, fname: string): RenderResult {
  const s = D[key];
  let html = TEMPLATES[nn];
  html = reSub(html, /<div class="headline">.*?<\/div>/s,
    '<div class="headline">\n    ' + s['headline'] + '\n  </div>');
  html = reSub(html, /<div class="subhl">.*?<\/div>/s,
    '<div class="subhl">' + s['subhl'] + '</div>');
  html = reSub(html, /<div class="chart-lbl">.*?<\/div>/s,
    '<div class="chart-lbl">' + s['chart_lbl'] + '</div>');
  html = reSub(html, /<div class="kpis">.*?<\/div>\s*<div class="body-grid">/s,
    buildKpis(s['kpis']) + '\n\n  <div class="body-grid">');
  html = reSub(html, /<div class="bars">.*?<\/div>\s*<\/div>\s*<\/div>\s*<div class="xaxis">/s,
    '<div class="bars">\n        ' + buildCssbars(s['chart']) + '\n            </div>\n          </div>\n        </div>\n        <div class="xaxis">');
  html = reSub(html, /<div class="side-col">.*?<\/div>\s*<\/div>\s*<div class="footer">/s,
    buildSidecol(s['sidecol']) + '\n  </div>\n\n  <div class="footer">');
  return { nn, file: fname, html };
}

// ============================================== SLIDE 01 (destaques bullets)
function genSlide01(D: Manifest): RenderResult {
  const s = D['slide01_destaques'];
  let html = TEMPLATES['01'];
  (s['bullets'] as string[]).forEach((b, i) => {
    html = replaceAll(html, `%%BULLET_${i + 1}%%`, b);
  });
  for (const [k, v] of Object.entries(s['tokens'] as Record<string, string>)) {
    html = replaceAll(html, `%%${k}%%`, v);
  }
  return { nn: '01', file: 'slide_01_destaques.html', html };
}

// ============================================== SLIDE 15 (óleo degomado)
function genSlide15(D: Manifest): RenderResult {
  const s = D['slide15_oleo_degomado'];
  let html = TEMPLATES['15'];
  html = reSub(html, /<div class="hl-main">.*?<\/div>/s,
    '<div class="hl-main">\n      ' + s['headline'] + '\n    </div>');
  html = reSub(html, /<div class="hl-sub">.*?<\/div>/s,
    '<div class="hl-sub">' + s['hl_sub'] + '</div>');
  html = reSub(html, /<div class="kpis">.*?<\/div>\s*<div class="body">/s,
    buildKpis(s['kpis']) + '\n\n  <div class="body">');
  html = reSub(html, /<div class="sec-label">Movimenta.*?<\/div>/s,
    '<div class="sec-label">' + s['sec_mov'] + '</div>');
  html = reSub(html, /<div class="sec-label">Faturamento.*?<\/div>/s,
    '<div class="sec-label">' + s['sec_fat'] + '</div>');
  const arr = (nm: string, items: (string | number)[], q = false) => {
    const b = items.map((x) =>
      q ? "'" + String(x).split("'").join("\\'") + "'" : fstr(x),
    ).join(',');
    return `const ${nm} = [${b}];`;
  };
  html = reSub(html, /const movLabels = \[.*?\];/s, arr('movLabels', s['mov_labels'], true));
  html = reSub(html, /const movVals\s*= \[.*?\];/s, arr('movVals', s['mov_vals']));
  html = reSub(html, /const fatLabels = \[.*?\];/s, arr('fatLabels', s['fat_labels'], true));
  html = reSub(html, /const fatVals\s*= \[.*?\];/s, arr('fatVals', s['fat_vals']));
  const col = (callouts: any[]) => {
    const blocks: string[] = [];
    for (const c of callouts) {
      const items = c['items'].map((it: any) =>
        `<div class="c-item"><span class="arr ${ARROW[it['a']][0]}">${ARROW[it['a']][1]}</span><span class="c-text">${it['t']}</span></div>`,
      ).join('');
      blocks.push(`<div>\n        <div class="callout-tag">${c['tag']}</div>\n        <div class="c-items">${items}</div>\n      </div>`);
    }
    return '<div class="callout-col">\n      ' + blocks.join('\n      ') + '\n    </div>';
  };
  html = reSub(html, /<div class="callout-col">.*?<\/div>\s*<\/div>\s*<div class="chart-col">/s,
    col(s['callouts_mov']) + '\n\n    <div class="chart-col">');
  html = reSub(html, /<div class="callout-col">.*?<\/div>\s*<\/div>\s*<\/div>\s*<script/s,
    col(s['callouts_fat']) + '\n  </div>\n</div>\n\n<script');
  return { nn: '15', file: 'slide_15_oleo_degomado.html', html };
}

// ============================================================ RUN
export const ORDER = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '18'];

export const SLIDE_LABELS: Record<string, string> = {
  '01': 'Destaques Comerciais', '02': 'Faturamento (Real×Orç)', '03': 'Carteira Faturamento Cliente',
  '04': 'Carteira Movimentação Cliente', '05': 'Curva ABC Produto', '06': 'Curva ABC Cliente',
  '07': 'Receita Bruta por Serviço', '08': 'Espaço Faturado M³', '09': 'Mov. Acumulado',
  '10': 'Mov. Mês Histórico', '11': 'Previsão×Realizado×Orçado', '12': 'Market Share Geral',
  '13': 'Market Share Derivados', '14': 'Market Share Soda Cáustica', '15': 'Óleo de Soja Degomado',
  '16': 'Movimentação Transpetro', '18': 'Histórico Top 10 Meses',
};

export function renderSlide(D: Manifest, nn: string): RenderResult {
  switch (nn) {
    case '01': return genSlide01(D);
    case '02': return genSlide02(D);
    case '03': return genSlide03(D);
    case '04': return genSlide04(D);
    case '05': return genSlide05(D);
    case '06': return genSlide06(D);
    case '07': return genBarsSlide(D, '07', 'slide07_receita_servico', 'slide_07_receita_servico.html');
    case '08': return genBarsSlide(D, '08', 'slide08_espaco_m3', 'slide_08_espaco_m3.html');
    case '09': return renderChartSlide(D, '09', 'slide09_mov_acumulado', 'slide_09_mov_acumulada.html');
    case '10': return renderChartSlide(D, '10', 'slide10_mov_maio', 'slide_10_mov_historico.html');
    case '11': return renderChartSlide(D, '11', 'slide11_previsao', 'slide_11_previsao.html');
    case '12': return renderChartSlide(D, '12', 'slide12_market_share', 'slide_12_market_share.html');
    case '13': return renderChartSlide(D, '13', 'slide13_ms_derivados', 'slide_13_ms_derivados.html');
    case '14': return genSoda(D);
    case '15': return genSlide15(D);
    case '16': return genTranspetro(D);
    case '18': return genTopMeses(D);
    default: throw new Error(`Slide desconhecido: ${nn}`);
  }
}

export function renderDeck(D: Manifest, only?: string[]): RenderResult[] {
  const alvo = only && only.length ? only : ORDER;
  return ORDER.filter((nn) => alvo.includes(nn)).map((nn) => renderSlide(D, nn));
}
