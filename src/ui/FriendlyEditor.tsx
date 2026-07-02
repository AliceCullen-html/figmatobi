/**
 * Editor amigável: transforma a seção do manifesto (JSON) num formulário com
 * rótulos em português, para quem não conhece HTML/JSON editar cada parte do
 * slide — títulos, indicadores, comentários, legendas, cores.
 *
 * É genérico/recursivo: funciona para qualquer slide sem código específico.
 * Strings com marcação (<span…>) mostram um aviso e podem ser editadas mantendo
 * as etiquetas de cor. Cores em hex viram um seletor visual.
 */
import { type ReactNode } from 'react';

/** Nomes amigáveis para as chaves do manifesto. */
const LABELS: Record<string, string> = {
  headline: 'Título principal', hl_main: 'Título principal', subhl: 'Subtítulo',
  hl_sub: 'Subtítulo', chart_lbl: 'Rótulo do gráfico',
  kpis: 'Indicadores (KPIs)', kpi: 'Indicador', lbl: 'Rótulo', val: 'Valor',
  sub: 'Descrição', subs: 'Descrições',
  callouts: 'Comentários', callouts_mov: 'Comentários — Movimentação',
  callouts_fat: 'Comentários — Faturamento', items: 'Itens', t: 'Texto',
  tag: 'Título do bloco', a: 'Ícone (up/down/warn/neu)', tag_cls: 'Estilo do bloco',
  rows: 'Linhas da tabela', total: 'Total', ajudou: 'O que ajudou',
  pressionou: 'O que pressionou', prioridades: 'Prioridades de ação',
  sidecol: 'Coluna lateral', cards: 'Cartões ABC', pareto: 'Barras do Pareto',
  segs: 'Fatias do donut', niveis: 'Níveis (A/B/C)', pills: 'Clientes',
  donut_title: 'Título do donut', donut_center: 'Centro do donut',
  mov_labels: 'Clientes (Movimentação)', mov_vals: 'Valores — Movimentação (TON)',
  fat_labels: 'Clientes (Faturamento)', fat_vals: 'Valores — Faturamento (R$ x1.000)',
  sec_mov: 'Título — Movimentação', sec_fat: 'Título — Faturamento',
  bullets: 'Tópicos', labels: 'Rótulos (meses)', volumes: 'Volumes',
  data: 'Dados por mês', faturamento: 'Ranking — Faturamento', volume: 'Ranking — Volume',
  tokens: 'Textos fixos', meta: 'Configuração do mês', chart: 'Gráfico (avançado)',
  headline_up: 'Destaque', val_color: 'Cor do valor',
  bar: 'Cor da barra', color: 'Cor', textColor: 'Cor do texto', cls: 'Estilo',
  meses_consecutivos: 'Meses consecutivos', ytd_k: 'YTD (k)', min_k: 'Mínimo (k)',
  max_k: 'Máximo (k)', min_mes: 'Mês do mínimo', max_mes: 'Mês do máximo',
  recorde_vol_k: 'Recorde de volume (k)', recorde_vol_mes: 'Mês do recorde',
  label: 'Rótulo', pct: 'Percentual', badge: 'Nível',
  d1: 'Texto — linha 1', d2: 'Texto — linha 2', d1c: 'Cor da linha 1',
  d2c: 'Cor da linha 2', d2color: 'Cor 2 (hex)', vcls: 'Estilo do valor',
  val_cls: 'Estilo do valor', sub_cls: 'Estilo da descrição', vcolor: 'Cor do valor',
  vsize: 'Tamanho do valor', kind: 'Tipo da barra', isOrc: 'É orçado?',
  y_max: 'Máximo do eixo Y', engine: 'Motor do gráfico', unit: 'Unidade',
  axis_max: 'Máximo do eixo', split: 'Divisão (%)', colors: 'Cores', legend: 'Legenda',
  foot: 'Rodapé', months: 'Meses', totals: 'Totais', series: 'Séries', anos: 'Anos',
  bars: 'Barras', meses: 'Meses', nav_corrente: 'Meses do ano atual',
  janela_label: 'Rótulo da janela', mes: 'Mês', mes_num: 'Número do mês', ano: 'Ano',
  ref: 'Referência', pagina: 'Página', fat_top1_mi: 'Fat. 1º lugar (Mi)',
  fat_top2_mi: 'Fat. 2º lugar (Mi)', met: 'Metanol', der: 'Derivados', aq: 'Aquecidos',
  ov: 'Óleo Vegetal', sc: 'Soda Cáustica', bio: 'Biocombustíveis', out: 'Outros',
  hl_up: 'Destaque (verde)', vf: 'Var. Fat.', vm: 'Var. Mov.',
};

/** Campos com opções fixas → viram menu suspenso amigável. */
const ENUMS: Record<string, [string, string][]> = {
  a: [['up', '▲ Positivo (verde)'], ['down', '▼ Negativo (vermelho)'], ['warn', '→ Atenção (amarelo)'], ['neu', '→ Neutro']],
  d1c: [['', '— sem cor —'], ['up', '▲ Positivo (verde)'], ['down', '▼ Negativo (vermelho)'], ['warn', '→ Atenção']],
  d2c: [['', '— sem cor —'], ['up', '▲ Positivo (verde)'], ['down', '▼ Negativo (vermelho)'], ['warn', '→ Atenção'], ['neu', '→ Neutro']],
  val_cls: [['', '— normal —'], ['pos', 'Positivo (verde)'], ['neg', 'Negativo (vermelho)'], ['warn', 'Atenção (amarelo)'], ['up', 'Verde']],
  sub_cls: [['', '— normal —'], ['pos', 'Positivo (verde)'], ['neg', 'Negativo (vermelho)'], ['warn', 'Atenção']],
  vcls: [['', '— normal —'], ['pos', 'Positivo (verde)'], ['neg', 'Negativo (vermelho)'], ['warn', 'Atenção']],
  kind: [['prev', 'Previsão'], ['real', 'Realizado'], ['orc', 'Orçado']],
  badge: [['a', 'Nível A'], ['b', 'Nível B'], ['c', 'Nível C']],
};

function friendlyLabel(k: string): string {
  if (!k) return '';
  if (LABELS[k]) return LABELS[k];
  // fallback: capitaliza e troca _ por espaço
  return k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

const isHex = (s: string) => /^#[0-9a-f]{3,8}$/i.test(s.trim());
const hasMarkup = (s: string) => /<[a-z][^>]*>/i.test(s);

function Grupo({ titulo, aberto, children }: { titulo: string; aberto: boolean; children: ReactNode }) {
  // grupo raiz (sem título) → sem <details> (evita o "Details" padrão do navegador)
  if (!titulo) return <div className="fe-grp-body fe-raiz">{children}</div>;
  return (
    <details className="fe-grp" open={aberto}>
      <summary className="fe-grp-h">{titulo}</summary>
      <div className="fe-grp-body">{children}</div>
    </details>
  );
}

function Campo({ label, fieldKey, v, onChange, depth }: { label: string; fieldKey?: string; v: unknown; onChange: (nv: unknown) => void; depth: number }) {
  // campo com opções fixas → menu suspenso
  if (typeof v === 'string' && fieldKey && ENUMS[fieldKey]) {
    return (
      <label className="fe-fld">
        <span>{label}</span>
        <select value={v} onChange={(e) => onChange(e.target.value)}>
          {ENUMS[fieldKey].map(([val, txt]) => <option key={val} value={val}>{txt}</option>)}
        </select>
      </label>
    );
  }
  // string
  if (typeof v === 'string') {
    if (isHex(v)) {
      return (
        <label className="fe-fld fe-cor">
          <span>{label}</span>
          <span className="fe-cor-row">
            <input type="color" value={v} onChange={(e) => onChange(e.target.value)} />
            <input type="text" value={v} onChange={(e) => onChange(e.target.value)} />
          </span>
        </label>
      );
    }
    const long = v.length > 55 || hasMarkup(v);
    return (
      <label className="fe-fld">
        <span>{label}{hasMarkup(v) && <em className="fe-hint"> — contém cores; edite o texto e mantenha as etiquetas &lt;…&gt;</em>}</span>
        {long
          ? <textarea value={v} onChange={(e) => onChange(e.target.value)} rows={hasMarkup(v) ? 3 : 2} spellCheck={false} />
          : <input type="text" value={v} onChange={(e) => onChange(e.target.value)} />}
      </label>
    );
  }
  // number
  if (typeof v === 'number') {
    return (
      <label className="fe-fld fe-num">
        <span>{label}</span>
        <input type="number" value={v} step="any" onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
      </label>
    );
  }
  // boolean
  if (typeof v === 'boolean') {
    return (
      <label className="fe-fld fe-bool">
        <input type="checkbox" checked={v} onChange={(e) => onChange(e.target.checked)} />
        <span>{label}</span>
      </label>
    );
  }
  // array
  if (Array.isArray(v)) {
    // array de primitivos (ex.: legendas) → lista compacta
    const primitivo = v.every((x) => typeof x !== 'object' || x === null);
    return (
      <Grupo titulo={`${label} (${v.length})`} aberto={depth < 1}>
        {v.map((item, i) => (
          <div className="fe-item" key={i}>
            <div className="fe-item-bar">
              <span className="fe-item-idx">#{i + 1}</span>
              <button type="button" className="fe-x" title="Remover" onClick={() => onChange(v.filter((_, j) => j !== i))}>✕</button>
            </div>
            <Campo
              label={primitivo ? '' : `Item ${i + 1}`}
              fieldKey={fieldKey}
              v={item}
              depth={depth + 1}
              onChange={(nv) => onChange(v.map((x, j) => (j === i ? nv : x)))}
            />
          </div>
        ))}
        <button type="button" className="fe-add" onClick={() => onChange([...v, cloneVazio(v[0])])}>+ Adicionar</button>
      </Grupo>
    );
  }
  // objeto
  if (v && typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>);
    return (
      <Grupo titulo={label} aberto={depth < 1}>
        {entries.map(([kk, vv]) => (
          <Campo
            key={kk}
            label={friendlyLabel(kk)}
            fieldKey={kk}
            v={vv}
            depth={depth + 1}
            onChange={(nv) => onChange({ ...(v as object), [kk]: nv })}
          />
        ))}
      </Grupo>
    );
  }
  return null;
}

/** cria um item "vazio" com a mesma forma do primeiro, para o botão Adicionar. */
function cloneVazio(modelo: unknown): unknown {
  if (typeof modelo === 'string') return '';
  if (typeof modelo === 'number') return 0;
  if (typeof modelo === 'boolean') return false;
  if (Array.isArray(modelo)) return modelo.map(cloneVazio);
  if (modelo && typeof modelo === 'object') {
    return Object.fromEntries(Object.entries(modelo).map(([k, val]) => [k, cloneVazio(val)]));
  }
  return '';
}

export function FriendlyEditor({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  return (
    <div className="fe-root">
      <Campo label="" v={value} onChange={onChange} depth={0} />
    </div>
  );
}
