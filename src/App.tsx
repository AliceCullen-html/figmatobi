/**
 * App do deck Cattalini: subir Excel → conferir preview → baixar deck.
 * Fluxo: Upload → (Mapeamento, se necessário) → Preview/Overrides → Export.
 */
import { useMemo, useState, useCallback } from 'react';
import { parseWorkbook } from './etl/excel';
import { autoDetect, mappingCompativel } from './etl/mapping';
import { buildManifest, type EtlResult } from './etl/etl';
import { DATASET_FIELDS, DATASET_LABELS, type DatasetKey, type MappingConfig, type SheetData } from './etl/types';
import { renderDeck, ORDER, SLIDE_LABELS, type RenderResult } from './engine/engine';
import { toSvgMode } from './charts/svg';
import { loadProjeto, saveProjeto, aplicarOverrides, statusSlide, download, SLIDE_KEY, type ProjetoState } from './ui/state';
import { baixarZip, baixarPdf, baixarPngsZip, baixarHtml, baixarPng } from './ui/exportar';

type Tela = 'upload' | 'mapeamento' | 'deck';

export default function App() {
  const [tela, setTela] = useState<Tela>('upload');
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [projeto, setProjeto] = useState<ProjetoState>(() => loadProjeto());
  const [etl, setEtl] = useState<EtlResult | null>(null);
  const [erro, setErro] = useState<string>('');
  const [modoSvg, setModoSvg] = useState(true);
  const [slideAberto, setSlideAberto] = useState<string | null>(null);
  const [editorSlide, setEditorSlide] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<string>('');
  const [carregando, setCarregando] = useState(false);

  const salvar = useCallback((p: ProjetoState) => { setProjeto(p); saveProjeto(p); }, []);

  const rodarEtl = useCallback((shs: SheetData[], cfg: MappingConfig) => {
    try {
      setEtl(buildManifest(shs, cfg));
      setErro('');
      setTela('deck');
    } catch (e) {
      setErro(String((e as Error).message ?? e));
      setTela('mapeamento');
    }
  }, []);

  // adiciona arquivos SEM avançar de tela — o deck só é gerado no botão "Gerar deck"
  const onFiles = useCallback(async (files: FileList | File[]) => {
    setCarregando(true);
    setErro('');
    try {
      const novas: SheetData[] = [];
      let proj = projeto;
      for (const f of files) {
        if (f.name.endsWith('.json')) {
          // import de mapping.config.json ou projeto.json salvos
          const j = JSON.parse(await f.text());
          if (j.datasets) proj = { ...proj, mapping: j };
          else if (j.overrides) proj = { ...proj, ...j };
          continue;
        }
        const buf = await f.arrayBuffer();
        novas.push(...parseWorkbook(f.name, buf));
      }
      if (proj !== projeto) salvar(proj);
      setSheets((atuais) => [...atuais.filter((s) => !novas.some((n) => n.file === s.file)), ...novas]);
    } catch (e) {
      setErro(String((e as Error).message ?? e));
    } finally {
      setCarregando(false);
    }
  }, [projeto, salvar]);

  const removerArquivo = useCallback((file: string) => {
    setSheets((atuais) => atuais.filter((s) => s.file !== file));
  }, []);

  const gerarDeck = useCallback(() => {
    if (!sheets.length) return;
    // se há mapping salvo compatível → pula direto pro preview
    if (projeto.mapping && mappingCompativel(projeto.mapping, sheets)) {
      rodarEtl(sheets, projeto.mapping);
      return;
    }
    const auto = autoDetect(sheets);
    auto.criadoEm = new Date().toISOString();
    salvar({ ...projeto, mapping: auto });
    setTela('mapeamento');
  }, [sheets, projeto, salvar, rodarEtl]);

  // manifesto com overrides aplicados
  const manifesto = useMemo(() => (etl ? aplicarOverrides(etl.manifesto, projeto.overrides) : null), [etl, projeto.overrides]);

  // deck canônico (Chart.js) e modo de exibição (SVG default — alvo do Figma)
  const deck = useMemo<RenderResult[]>(() => (manifesto ? renderDeck(manifesto) : []), [manifesto]);
  const deckExibicao = useMemo<RenderResult[]>(
    () => (manifesto ? deck.map((s) => (modoSvg ? { ...s, html: toSvgMode(s.html, s.nn, manifesto) } : s)) : []),
    [deck, modoSvg, manifesto],
  );

  const pendencias = etl?.pendencias ?? [];
  const validacoes = etl?.validacoes ?? [];
  const completo = ORDER.every((nn) => statusSlide(nn, pendencias, validacoes, projeto.pendResolvidas) === 'ok');

  return (
    <div className="app">
      <header className="topo">
        <div>
          <div className="logo-tag">CATTALINI · COMERCIAL</div>
          <h1>Deck Mensal — Excel → 18 slides</h1>
        </div>
        {etl && (
          <div className="topo-acoes">
            <span className="ref-badge">{manifesto?.meta?.janela_label} · ref {manifesto?.meta?.ref}</span>
            <label className="toggle">
              <input type="checkbox" checked={modoSvg} onChange={(e) => setModoSvg(e.target.checked)} />
              <span>{modoSvg ? 'SVG (editável Figma)' : 'Chart.js (fiel ao original)'}</span>
            </label>
            <button className="btn sec" onClick={() => setTela('mapeamento')}>Mapeamento</button>
            <button className="btn sec" onClick={() => { setEtl(null); setSheets([]); setTela('upload'); }}>Novo Excel</button>
          </div>
        )}
      </header>

      {erro && <div className="erro-bar">⛔ {erro}</div>}

      {tela === 'upload' && (
        <TelaUpload
          onFiles={onFiles}
          carregando={carregando}
          temMapping={!!projeto.mapping}
          sheets={sheets}
          onRemover={removerArquivo}
          onGerar={gerarDeck}
        />
      )}

      {tela === 'mapeamento' && projeto.mapping && (
        <TelaMapeamento
          sheets={sheets}
          mapping={projeto.mapping}
          onChange={(m) => salvar({ ...projeto, mapping: m })}
          onConfirmar={() => rodarEtl(sheets, projeto.mapping!)}
          onBaixar={() => download('mapping.config.json', JSON.stringify(projeto.mapping, null, 2), 'application/json')}
        />
      )}

      {tela === 'deck' && etl && manifesto && (
        <div className="deck-grid-wrap">
          <PainelStatus
            pendencias={pendencias}
            validacoes={validacoes}
            resolvidas={projeto.pendResolvidas}
            completo={completo}
            onResolver={(id) => salvar({ ...projeto, pendResolvidas: [...new Set([...projeto.pendResolvidas, id])] })}
            onAbrirSlide={(nn) => setEditorSlide(nn)}
          />
          <div className="deck-main">
            <div className="export-bar">
              <button className="btn" onClick={() => baixarZip(deckExibicao, {
                'manifesto.json': JSON.stringify(manifesto, null, 1),
                'mapping.config.json': JSON.stringify(projeto.mapping, null, 2),
                'projeto.json': JSON.stringify(projeto, null, 1),
              })}>⬇ Baixar deck .zip (HTML p/ Figma)</button>
              <button className="btn sec" disabled={!!progresso} onClick={async () => {
                await baixarPdf(deckExibicao, (i, t) => setProgresso(`PDF ${i}/${t}…`));
                setProgresso('');
              }}>⬇ PDF</button>
              <button className="btn sec" disabled={!!progresso} onClick={async () => {
                await baixarPngsZip(deckExibicao, (i, t) => setProgresso(`PNG ${i}/${t}…`));
                setProgresso('');
              }}>⬇ PNGs</button>
              <button className="btn sec" onClick={() => download('manifesto.json', JSON.stringify(manifesto, null, 1), 'application/json')}>⬇ manifesto.json</button>
              {progresso && <span className="progresso">{progresso}</span>}
              {!completo && <span className="aviso-incompleto">⚠️ Deck com pendências — resolva ou marque "sem alteração" antes de publicar</span>}
            </div>
            <div className="grid-slides">
              {deckExibicao.map((s) => {
                const st = statusSlide(s.nn, pendencias, validacoes, projeto.pendResolvidas);
                return (
                  <div key={s.nn} className="card-slide">
                    <div className="card-head">
                      <span className="card-num">{s.nn}</span>
                      <span className="card-title">{SLIDE_LABELS[s.nn]}</span>
                      <span className={`badge-st st-${st}`}>{st === 'ok' ? '✅' : st === 'warn' ? '⚠️' : '⛔'}</span>
                    </div>
                    <div className="thumb" onClick={() => setSlideAberto(s.nn)}>
                      <iframe title={s.nn} srcDoc={s.html} scrolling="no" loading="lazy" />
                    </div>
                    <div className="card-acoes">
                      <button className="mini" onClick={() => setSlideAberto(s.nn)}>Abrir 1440×829</button>
                      <button className="mini" onClick={() => setEditorSlide(s.nn)}>Override</button>
                      <button className="mini" onClick={() => baixarHtml(s)}>HTML</button>
                      <button className="mini" onClick={() => baixarPng(s)}>PNG</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {slideAberto && manifesto && (
        <div className="modal" onClick={() => setSlideAberto(null)}>
          <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
            <div className="modal-bar">
              <strong>Slide {slideAberto} — {SLIDE_LABELS[slideAberto]}</strong>
              <button className="btn sec" onClick={() => setSlideAberto(null)}>Fechar ✕</button>
            </div>
            <iframe
              title={`slide-${slideAberto}`}
              className="frame-full"
              srcDoc={deckExibicao.find((s) => s.nn === slideAberto)?.html}
              scrolling="no"
            />
          </div>
        </div>
      )}

      {editorSlide && manifesto && etl && (
        <EditorOverride
          nn={editorSlide}
          manifesto={manifesto}
          pendencias={pendencias.filter((p) => p.slide === editorSlide)}
          resolvidas={projeto.pendResolvidas}
          onFechar={() => setEditorSlide(null)}
          onAplicar={(patch) => {
            // correção aplicada NA HORA; só o slide afetado muda no manifesto
            salvar({ ...projeto, overrides: { ...projeto.overrides, [SLIDE_KEY[editorSlide]]: patch } });
          }}
          onLimpar={() => {
            const o = { ...projeto.overrides };
            delete o[SLIDE_KEY[editorSlide]];
            salvar({ ...projeto, overrides: o });
          }}
          onResolver={(id) => salvar({ ...projeto, pendResolvidas: [...new Set([...projeto.pendResolvidas, id])] })}
        />
      )}
    </div>
  );
}

// ---------------- Upload ----------------
function TelaUpload({ onFiles, carregando, temMapping, sheets, onRemover, onGerar }: {
  onFiles: (f: FileList) => void;
  carregando: boolean;
  temMapping: boolean;
  sheets: SheetData[];
  onRemover: (file: string) => void;
  onGerar: () => void;
}) {
  const [drag, setDrag] = useState(false);
  const arquivos = [...new Set(sheets.map((s) => s.file))];
  const pareceOrcamento = (f: string) => /or[cç]amento|or[cç]ado/i.test(f);
  const temRealizado = arquivos.some((f) => !pareceOrcamento(f));
  const temOrcado = arquivos.some(pareceOrcamento);
  return (
    <div
      className={`dropzone ${drag ? 'drag' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
    >
      <div className="drop-icone">📊</div>
      <h2>{carregando ? 'Lendo Excel…' : 'Arraste os Excel do mês aqui'}</h2>
      <p>Suba os <strong>dois</strong> arquivos: <strong>Realizado</strong> e <strong>Orçamento</strong> (.xlsx) — um de cada vez ou juntos.<br />
        Também aceita <code>mapping.config.json</code> e <code>projeto.json</code> salvos.</p>
      {temMapping && <p className="ok-mapping">✅ Já existe um mapeamento salvo — se o layout for igual, o preview abre direto.</p>}

      {arquivos.length > 0 && (
        <div className="lista-arquivos">
          {arquivos.map((f) => (
            <div key={f} className="arq-chip">
              <span className="arq-tipo">{pareceOrcamento(f) ? '🎯 Orçamento' : '📈 Realizado'}</span>
              <span className="arq-nome">{f.split('/').pop()}</span>
              <span className="arq-abas">{sheets.filter((s) => s.file === f).length} abas</span>
              <button className="arq-x" title="Remover" onClick={(e) => { e.stopPropagation(); onRemover(f); }}>✕</button>
            </div>
          ))}
          {!temOrcado && <p className="falta-arquivo">⚠️ Falta o Excel de <strong>Orçamento</strong> — sem ele o slide 02 (Real × Orçado) fica bloqueado.</p>}
          {!temRealizado && <p className="falta-arquivo">⚠️ Falta o Excel de <strong>Realizado</strong>.</p>}
        </div>
      )}

      <div className="upload-acoes">
        <label className="btn sec">
          + Adicionar arquivo
          <input type="file" multiple accept=".xlsx,.xls,.json" hidden onChange={(e) => { if (e.target.files) { onFiles(e.target.files); e.target.value = ''; } }} />
        </label>
        {arquivos.length > 0 && (
          <button className="btn" disabled={carregando} onClick={(e) => { e.stopPropagation(); onGerar(); }}>
            Gerar deck ({arquivos.length} arquivo{arquivos.length > 1 ? 's' : ''}) →
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------- Mapeamento ----------------
function TelaMapeamento({ sheets, mapping, onChange, onConfirmar, onBaixar }: {
  sheets: SheetData[];
  mapping: MappingConfig;
  onChange: (m: MappingConfig) => void;
  onConfirmar: () => void;
  onBaixar: () => void;
}) {
  const keys = Object.keys(DATASET_FIELDS) as DatasetKey[];
  const setDs = (key: DatasetKey, file: string, sheet: string) => {
    const sh = sheets.find((s) => s.file === file && s.sheet === sheet);
    const columns: Record<string, string> = {};
    if (sh) {
      for (const f of DATASET_FIELDS[key]) {
        const hit = sh.headers.find((h) => f.hints.some((d) => h.toLowerCase().includes(d.toLowerCase())));
        if (hit) columns[f.field] = hit;
      }
    }
    onChange({ ...mapping, datasets: { ...mapping.datasets, [key]: { file, sheet, columns } } });
  };
  const setCol = (key: DatasetKey, field: string, colName: string) => {
    const ds = mapping.datasets[key];
    if (!ds) return;
    onChange({ ...mapping, datasets: { ...mapping.datasets, [key]: { ...ds, columns: { ...ds.columns, [field]: colName } } } });
  };
  return (
    <div className="mapeamento">
      <h2>Assistente de Mapeamento</h2>
      <p className="sub">Confira o de-para detectado automaticamente (aba do Excel → dados do deck). Corrija uma vez, baixe o <code>mapping.config.json</code> e nos próximos meses o fluxo vira: <strong>subir Excel → baixar deck</strong>.</p>
      {keys.map((key) => {
        const ds = mapping.datasets[key];
        const sh = ds ? sheets.find((s) => s.sheet === ds.sheet && (!ds.file || s.file === ds.file)) : undefined;
        return (
          <div key={key} className="ds-bloco">
            <div className="ds-head">
              <strong>{DATASET_LABELS[key]}</strong>
              <select
                value={ds ? `${ds.file}::${ds.sheet}` : ''}
                onChange={(e) => {
                  const [file, sheet] = e.target.value.split('::');
                  if (sheet) setDs(key, file, sheet);
                }}
              >
                <option value="">— não mapeado —</option>
                {sheets.filter((s) => s.rows.length > 3).map((s) => (
                  <option key={`${s.file}::${s.sheet}`} value={`${s.file}::${s.sheet}`}>
                    {s.sheet} · {s.rows.length} linhas · {s.file.split('/').pop()}
                  </option>
                ))}
              </select>
            </div>
            {ds && sh && (
              <div className="ds-campos">
                {DATASET_FIELDS[key].map((f) => (
                  <label key={f.field} className={f.required && !ds.columns[f.field] ? 'campo-falta' : ''}>
                    <span>{f.label}{f.required ? ' *' : ''}</span>
                    <select value={ds.columns[f.field] ?? ''} onChange={(e) => setCol(key, f.field, e.target.value)}>
                      <option value="">—</option>
                      {sh.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="map-acoes">
        <button className="btn" onClick={onConfirmar}>Confirmar e gerar deck →</button>
        <button className="btn sec" onClick={onBaixar}>⬇ Baixar mapping.config.json</button>
      </div>
    </div>
  );
}

// ---------------- Painel de status / pendências ----------------
function PainelStatus({ pendencias, validacoes, resolvidas, completo, onResolver, onAbrirSlide }: {
  pendencias: EtlResult['pendencias'];
  validacoes: EtlResult['validacoes'];
  resolvidas: string[];
  completo: boolean;
  onResolver: (id: string) => void;
  onAbrirSlide: (nn: string) => void;
}) {
  const abertas = pendencias.filter((p) => !resolvidas.includes(p.id));
  return (
    <aside className="painel">
      <div className={`selo ${completo ? 'selo-ok' : 'selo-warn'}`}>
        {completo ? '✅ Deck completo — pronto para exportar' : `⚠️ ${abertas.length} pendência(s) aberta(s)`}
      </div>
      {abertas.length > 0 && (
        <>
          <h3>Overrides pendentes</h3>
          <p className="painel-sub">Campos que o Excel não entrega com confiança (Regra de Ouro 8 — nunca inventar). Preencha via override ou marque "sem alteração este mês".</p>
          {abertas.map((p) => (
            <div key={p.id} className={`pend pend-${p.severidade}`}>
              <div className="pend-head">
                <span>{p.severidade === 'block' ? '⛔' : '⚠️'} Slide {p.slide}</span>
              </div>
              <div className="pend-txt">{p.rotulo}</div>
              <div className="pend-acoes">
                <button className="mini" onClick={() => onAbrirSlide(p.slide)}>Preencher override</button>
                <button className="mini" onClick={() => onResolver(p.id)}>Sem alteração este mês</button>
              </div>
            </div>
          ))}
        </>
      )}
      {validacoes.length > 0 && (
        <>
          <h3>Validações</h3>
          {validacoes.map((v, i) => (
            <div key={i} className={`pend pend-${v.severidade === 'error' ? 'block' : 'warn'}`}>
              <div className="pend-head"><span>{v.severidade === 'error' ? '⛔' : '⚠️'} Slide {v.slide}</span></div>
              <div className="pend-txt">{v.msg}</div>
              <div className="pend-acoes">
                <button className="mini" onClick={() => onAbrirSlide(v.slide)}>Abrir slide</button>
              </div>
            </div>
          ))}
        </>
      )}
    </aside>
  );
}

// ---------------- Editor de override por slide ----------------
function EditorOverride({ nn, manifesto, pendencias, resolvidas, onFechar, onAplicar, onLimpar, onResolver }: {
  nn: string;
  manifesto: Record<string, any>;
  pendencias: EtlResult['pendencias'];
  resolvidas: string[];
  onFechar: () => void;
  onAplicar: (patch: unknown) => void;
  onLimpar: () => void;
  onResolver: (id: string) => void;
}) {
  const key = SLIDE_KEY[nn];
  const [txt, setTxt] = useState(() => JSON.stringify(manifesto[key], null, 1));
  const [err, setErr] = useState('');
  return (
    <div className="modal" onClick={onFechar}>
      <div className="modal-inner editor" onClick={(e) => e.stopPropagation()}>
        <div className="modal-bar">
          <strong>Override — Slide {nn} ({SLIDE_LABELS[nn]})</strong>
          <button className="btn sec" onClick={onFechar}>Fechar ✕</button>
        </div>
        {pendencias.filter((p) => !resolvidas.includes(p.id)).map((p) => (
          <div key={p.id} className={`pend pend-${p.severidade}`}>
            <div className="pend-txt">{p.severidade === 'block' ? '⛔' : '⚠️'} {p.rotulo}</div>
            <div className="pend-acoes">
              <button className="mini" onClick={() => onResolver(p.id)}>Marcar resolvida</button>
            </div>
          </div>
        ))}
        <p className="painel-sub">Edite os dados desta seção do manifesto (JSON). Valores vêm vazios quando o Excel não entrega — <strong>nunca invente</strong>: use o print do BI como fonte. A correção re-renderiza só este slide.</p>
        <textarea className="json-editor" value={txt} onChange={(e) => setTxt(e.target.value)} spellCheck={false} />
        {err && <div className="erro-bar">JSON inválido: {err}</div>}
        <div className="map-acoes">
          <button className="btn" onClick={() => {
            try {
              onAplicar(JSON.parse(txt));
              setErr('');
              onFechar();
            } catch (e) { setErr(String((e as Error).message)); }
          }}>Aplicar override</button>
          <button className="btn sec" onClick={() => { onLimpar(); onFechar(); }}>Restaurar valores do Excel</button>
        </div>
      </div>
    </div>
  );
}
