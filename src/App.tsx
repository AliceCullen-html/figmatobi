/**
 * App do deck Cattalini: subir Excel → conferir preview → baixar deck.
 * Fluxo: Upload → (Mapeamento, se necessário) → Preview/Overrides → Export.
 */
import { useMemo, useState, useCallback } from 'react';
import { parseWorkbook, parseBiJson } from './etl/excel';
import { autoDetect, mappingCompativel } from './etl/mapping';
import { buildManifest, type EtlResult } from './etl/etl';
import { DATASET_FIELDS, DATASET_LABELS, type DatasetKey, type MappingConfig, type SheetData } from './etl/types';
import { renderDeck, ORDER, SLIDE_LABELS, type RenderResult } from './engine/engine';
import { toSvgMode } from './charts/svg';
import { loadProjeto, saveProjeto, aplicarOverrides, statusSlide, download, SLIDE_KEY, type ProjetoState } from './ui/state';
import { baixarZip, baixarPdf, baixarPngsZip, baixarHtml, baixarPng } from './ui/exportar';
import { UserChip } from './auth/Gate';
import { authEnabled } from './auth/msal';
import { FriendlyEditor } from './ui/FriendlyEditor';
import { HtmlStudio, type HtmlSlide } from './ui/HtmlStudio';

type Tela = 'upload' | 'mapeamento' | 'deck' | 'html';

export default function App() {
  const [tela, setTela] = useState<Tela>('upload');
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [projeto, setProjeto] = useState<ProjetoState>(() => loadProjeto());
  const [etl, setEtl] = useState<EtlResult | null>(null);
  const [erro, setErro] = useState<string>('');
  const [modoSvg, setModoSvg] = useState(true);
  const [slideAberto, setSlideAberto] = useState<string | null>(null);
  const [editorSlide, setEditorSlide] = useState<string | null>(null);
  const [editTabInicial, setEditTabInicial] = useState<'form' | 'json' | 'html'>('form');
  const [progresso, setProgresso] = useState<string>('');
  const [carregando, setCarregando] = useState(false);
  const [mesSel, setMesSel] = useState<string>(''); // 'ano-mes' ou '' = mais recente
  const [htmlUploads, setHtmlUploads] = useState<HtmlSlide[]>([]); // .html enviados p/ o estúdio

  const salvar = useCallback((p: ProjetoState) => { setProjeto(p); saveProjeto(p); }, []);

  const rodarEtl = useCallback((shs: SheetData[], cfg: MappingConfig, mes?: string) => {
    try {
      const m = (mes ?? '').split('-').map(Number);
      const mesRef = m.length === 2 && m[0] ? { ano: m[0], mesN: m[1] } : undefined;
      setEtl(buildManifest(shs, cfg, mesRef));
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
        if (/\.html?$/i.test(f.name)) {
          // HTML pronto → vai para o Estúdio de HTML
          const html = await f.text();
          setHtmlUploads((prev) => [...prev.filter((s) => s.file !== f.name), { file: f.name, html }]);
          continue;
        }
        if (f.name.endsWith('.json')) {
          const txt = await f.text();
          const j = JSON.parse(txt.replace(/^﻿/, ''));
          if (j?.results?.[0]?.tables) {
            // export JSON do Power BI (resumo-bi*.json) → vira "abas" sintéticas
            novas.push(...parseBiJson(f.name, txt));
          } else if (j.datasets) {
            proj = { ...proj, mapping: j }; // mapping.config.json
          } else if (j.overrides) {
            proj = { ...proj, ...j }; // projeto.json
          }
          continue;
        }
        const buf = await f.arrayBuffer();
        novas.push(...(await parseWorkbook(f.name, buf)));
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

  // deck canônico (Chart.js) e modo de exibição (SVG default — alvo do Figma);
  // HTML editado à mão (✏️) vence sobre o gerado
  const deck = useMemo<RenderResult[]>(() => (manifesto ? renderDeck(manifesto) : []), [manifesto]);
  const deckExibicao = useMemo<RenderResult[]>(
    () => (manifesto ? deck.map((s) => ({
      ...s,
      html: projeto.htmlEdits[s.nn] ?? (modoSvg ? toSvgMode(s.html, s.nn, manifesto) : s.html),
    })) : []),
    [deck, modoSvg, manifesto, projeto.htmlEdits],
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
        <div className="topo-dir">
          {etl && (
            <div className="topo-acoes">
              <label className="toggle" title="Mês do relatório">
                <span>Mês:</span>
                <select
                  className="sel-mes"
                  value={mesSel || `${manifesto?.meta?.ano}-${manifesto?.meta?.mes_num}`}
                  onChange={(e) => { setMesSel(e.target.value); rodarEtl(sheets, projeto.mapping!, e.target.value); }}
                >
                  {[...etl.mesesDisponiveis].reverse().map((m) => (
                    <option key={`${m.ano}-${m.mesN}`} value={`${m.ano}-${m.mesN}`}>{m.label}</option>
                  ))}
                </select>
              </label>
              <span className="ref-badge">{manifesto?.meta?.janela_label}</span>
              <label className="toggle">
                <input type="checkbox" checked={modoSvg} onChange={(e) => setModoSvg(e.target.checked)} />
                <span>{modoSvg ? 'SVG (editável Figma)' : 'Chart.js (fiel ao original)'}</span>
              </label>
              <button className="btn sec" onClick={() => setTela('mapeamento')}>Mapeamento</button>
              <button className="btn sec" onClick={() => { setEtl(null); setSheets([]); setTela('upload'); }}>Novo Excel</button>
            </div>
          )}
          {authEnabled && <UserChip />}
        </div>
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
          htmlUploads={htmlUploads}
          onRemoverHtml={(file) => setHtmlUploads((prev) => prev.filter((s) => s.file !== file))}
          onEditarHtml={() => setTela('html')}
        />
      )}

      {tela === 'html' && (
        <div className="deck-grid-wrap html-wrap">
          <HtmlStudio iniciais={htmlUploads} onVoltar={() => setTela('upload')} />
        </div>
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
            onAbrirSlide={(nn) => { setEditTabInicial('form'); setEditorSlide(nn); }}
          />
          <div className="deck-main">
            <div className="export-bar">
              <button className="btn" onClick={() => baixarZip(deckExibicao, {
                'manifesto.json': JSON.stringify(manifesto, null, 1),
                'mapping.config.json': JSON.stringify(projeto.mapping, null, 2),
                'projeto.json': JSON.stringify(projeto, null, 1),
              })}>⬇ Baixar deck .zip (HTML p/ Figma)</button>
              <button className="btn sec" title="Abre a janela de impressão — escolha 'Salvar como PDF'" onClick={() => baixarPdf(deckExibicao)}>🖨 PDF</button>
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
                      {(!!projeto.htmlEdits[s.nn] || !!projeto.overrides[SLIDE_KEY[s.nn]]) && <span className="badge-editado" title="Slide editado manualmente">✏️</span>}
                      <span className={`badge-st st-${st}`}>{st === 'ok' ? '✅' : st === 'warn' ? '⚠️' : '⛔'}</span>
                    </div>
                    <div className="thumb" onClick={() => setSlideAberto(s.nn)}>
                      <iframe title={s.nn} srcDoc={s.html} scrolling="no" loading="lazy" />
                    </div>
                    <div className="card-acoes">
                      <button className="mini" onClick={() => setSlideAberto(s.nn)}>Abrir 1440×829</button>
                      <button className="mini mini-edit" onClick={() => { setEditTabInicial('form'); setEditorSlide(s.nn); }}>✏️ Editar</button>
                      <button className="mini" onClick={() => baixarHtml(s)}>⬇ HTML</button>
                      <button className="mini" onClick={() => baixarPng(s)}>⬇ PNG</button>
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
        <EditorSlide
          nn={editorSlide}
          tabInicial={editTabInicial}
          manifesto={manifesto}
          htmlAtual={deckExibicao.find((s) => s.nn === editorSlide)?.html ?? ''}
          temOverride={!!projeto.overrides[SLIDE_KEY[editorSlide]]}
          temHtmlEdit={!!projeto.htmlEdits[editorSlide]}
          pendencias={pendencias.filter((p) => p.slide === editorSlide)}
          resolvidas={projeto.pendResolvidas}
          onFechar={() => setEditorSlide(null)}
          onAplicarDados={(patch) => salvar({ ...projeto, overrides: { ...projeto.overrides, [SLIDE_KEY[editorSlide]]: patch } })}
          onLimparDados={() => {
            const o = { ...projeto.overrides };
            delete o[SLIDE_KEY[editorSlide]];
            salvar({ ...projeto, overrides: o });
          }}
          onAplicarHtml={(html) => salvar({ ...projeto, htmlEdits: { ...projeto.htmlEdits, [editorSlide]: html } })}
          onLimparHtml={() => {
            const e2 = { ...projeto.htmlEdits };
            delete e2[editorSlide];
            salvar({ ...projeto, htmlEdits: e2 });
          }}
          onResolver={(id) => salvar({ ...projeto, pendResolvidas: [...new Set([...projeto.pendResolvidas, id])] })}
        />
      )}
    </div>
  );
}

// ---------------- Upload ----------------
function TelaUpload({ onFiles, carregando, temMapping, sheets, onRemover, onGerar, htmlUploads, onRemoverHtml, onEditarHtml }: {
  onFiles: (f: File[]) => void;
  carregando: boolean;
  temMapping: boolean;
  sheets: SheetData[];
  onRemover: (file: string) => void;
  onGerar: () => void;
  htmlUploads: HtmlSlide[];
  onRemoverHtml: (file: string) => void;
  onEditarHtml: () => void;
}) {
  const [drag, setDrag] = useState(false);
  const arquivos = [...new Set(sheets.map((s) => s.file))];
  const ehJson = (f: string) => f.endsWith('.json');
  const pareceOrcamento = (f: string) => /or[cç]amento|or[cç]ado/i.test(f);
  const tipoArquivo = (f: string) => (ehJson(f) ? '🧩 JSON do BI' : pareceOrcamento(f) ? '🎯 Orçamento' : '📈 Realizado');
  const temRealizado = arquivos.some((f) => !ehJson(f) && !pareceOrcamento(f));
  const temOrcado = arquivos.some((f) => !ehJson(f) && pareceOrcamento(f));
  return (
    <div
      className={`dropzone ${drag ? 'drag' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(Array.from(e.dataTransfer.files)); }}
    >
      <div className="drop-icone">📊</div>
      <h2>{carregando ? 'Lendo Excel…' : 'Arraste os Excel do mês aqui'}</h2>
      <p>Suba os <strong>dois</strong> arquivos: <strong>Realizado</strong> e <strong>Orçamento</strong> (.xlsx) — um de cada vez ou juntos.<br />
        Também aceita os <strong>JSON do Power BI</strong> (<code>resumo-bi*.json</code>), <code>mapping.config.json</code> e <code>projeto.json</code>.<br />
        Ou suba <strong>HTML prontos</strong> (<code>.html</code>) para editar direto aqui.</p>
      {temMapping && <p className="ok-mapping">✅ Já existe um mapeamento salvo — se o layout for igual, o preview abre direto.</p>}

      {htmlUploads.length > 0 && (
        <div className="lista-arquivos">
          {htmlUploads.map((s) => (
            <div key={s.file} className="arq-chip">
              <span className="arq-tipo">🧩 HTML</span>
              <span className="arq-nome">{s.file}</span>
              <button className="arq-x" title="Remover" onClick={(e) => { e.stopPropagation(); onRemoverHtml(s.file); }}>✕</button>
            </div>
          ))}
          <button className="btn" onClick={(e) => { e.stopPropagation(); onEditarHtml(); }}>✏️ Editar {htmlUploads.length} HTML{htmlUploads.length > 1 ? 's' : ''} →</button>
        </div>
      )}

      {arquivos.length > 0 && (
        <div className="lista-arquivos">
          {arquivos.map((f) => (
            <div key={f} className="arq-chip">
              <span className="arq-tipo">{tipoArquivo(f)}</span>
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
        {/* sem arquivos → botão de escolher em destaque (amarelo); com arquivos → secundário */}
        <label className={arquivos.length ? 'btn sec' : 'btn'}>
          {arquivos.length ? '+ Adicionar arquivo' : '📁 Escolher arquivos (Excel ou HTML)'}
          <input type="file" multiple accept=".xlsx,.xls,.json,.html,.htm" hidden onChange={(e) => {
            // snapshot: o FileList é "vivo" e esvazia quando o input é limpo
            const fs = Array.from(e.target.files ?? []);
            e.target.value = '';
            if (fs.length) onFiles(fs);
          }} />
        </label>
        {arquivos.length > 0 && (
          <button className="btn" disabled={carregando} onClick={(e) => { e.stopPropagation(); onGerar(); }}>
            Gerar deck ({arquivos.length} arquivo{arquivos.length > 1 ? 's' : ''}) →
          </button>
        )}
        <button className="btn sec" title="Editar arquivos HTML prontos, sem Excel" onClick={(e) => { e.stopPropagation(); onEditarHtml(); }}>🧩 Editor de HTML</button>
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

// ---------------- Editor unificado por slide (Conteúdo / Dados / HTML) ----------------
type EditTab = 'form' | 'json' | 'html';

function EditorSlide({ nn, tabInicial, manifesto, htmlAtual, temOverride, temHtmlEdit, pendencias, resolvidas, onFechar, onAplicarDados, onLimparDados, onAplicarHtml, onLimparHtml, onResolver }: {
  nn: string;
  tabInicial: EditTab;
  manifesto: Record<string, any>;
  htmlAtual: string;
  temOverride: boolean;
  temHtmlEdit: boolean;
  pendencias: EtlResult['pendencias'];
  resolvidas: string[];
  onFechar: () => void;
  onAplicarDados: (patch: unknown) => void;
  onLimparDados: () => void;
  onAplicarHtml: (html: string) => void;
  onLimparHtml: () => void;
  onResolver: (id: string) => void;
}) {
  const key = SLIDE_KEY[nn];
  const [tab, setTab] = useState<EditTab>(tabInicial);
  // rascunho dos DADOS (compartilhado entre Conteúdo e JSON)
  const [draft, setDraft] = useState<any>(() => JSON.parse(JSON.stringify(manifesto[key])));
  const [jsonTxt, setJsonTxt] = useState(() => JSON.stringify(manifesto[key], null, 1));
  const [jsonErr, setJsonErr] = useState('');
  // rascunho do HTML
  const [htmlTxt, setHtmlTxt] = useState(htmlAtual);
  const [htmlPreview, setHtmlPreview] = useState(htmlAtual);
  const [printTxt, setPrintTxt] = useState('');

  // Conteúdo → sincroniza o JSON
  const setDraftSync = (v: unknown) => { setDraft(v); setJsonTxt(JSON.stringify(v, null, 1)); setJsonErr(''); };
  // JSON → sincroniza o rascunho
  const setJsonSync = (txt: string) => {
    setJsonTxt(txt);
    try { setDraft(JSON.parse(txt)); setJsonErr(''); } catch (e) { setJsonErr(String((e as Error).message)); }
  };

  const parsePrint = (linhas: string): [string, number][] => {
    const out: [string, number][] = [];
    for (const l of linhas.split('\n')) {
      const m = l.trim().match(/^(.+?)[\s·|:]+R?\$?\s*([\d.,]+)\s*(mi|k)?\s*$/i);
      if (!m) continue;
      let v = Number(m[2].replace(/\./g, '').replace(',', '.'));
      if (!Number.isFinite(v)) continue;
      if ((m[3] ?? '').toLowerCase() === 'mi') v *= 1000;
      out.push([m[1].trim(), Math.round(v)]);
    }
    return out;
  };

  const salvarDados = () => { onAplicarDados(draft); onFechar(); };

  return (
    <div className="modal" onClick={onFechar}>
      <div className={`modal-inner ${tab === 'html' ? 'editor-html' : 'editor'}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-bar">
          <strong>✏️ Editar — Slide {nn} · {SLIDE_LABELS[nn]}</strong>
          <button className="btn sec" onClick={onFechar}>Fechar ✕</button>
        </div>

        <div className="edit-tabs">
          <button className={`edit-tab${tab === 'form' ? ' on' : ''}`} onClick={() => setTab('form')}>📝 Conteúdo</button>
          <button className={`edit-tab${tab === 'json' ? ' on' : ''}`} onClick={() => setTab('json')}>{ } Dados (JSON)</button>
          <button className={`edit-tab${tab === 'html' ? ' on' : ''}`} onClick={() => setTab('html')}>&lt;/&gt; HTML</button>
          {temOverride && <span className="edit-flag">conteúdo editado</span>}
          {temHtmlEdit && <span className="edit-flag">HTML editado</span>}
        </div>

        {/* pendências (sempre visíveis) */}
        {pendencias.filter((p) => !resolvidas.includes(p.id)).map((p) => (
          <div key={p.id} className={`pend pend-${p.severidade}`}>
            <div className="pend-txt">{p.severidade === 'block' ? '⛔' : '⚠️'} {p.rotulo}</div>
            <div className="pend-acoes"><button className="mini" onClick={() => onResolver(p.id)}>Marcar resolvida</button></div>
          </div>
        ))}

        {/* atalho de print (slide 15) — em qualquer aba de dados */}
        {nn === '15' && tab !== 'html' && (
          <div className="colar-print">
            <div className="pend-head">📷 Preencher faturamento a partir do print do BI</div>
            <p className="painel-sub">Cole uma linha por cliente — ex.: <code>Cargill R$ 9,28 Mi</code> ou <code>Cargill 9280</code> (R$ x1.000).</p>
            <textarea className="json-editor print-editor" placeholder={'Cargill R$ 9,28 Mi\nLDC R$ 8,63 Mi\nCoamo 3760\n…'} value={printTxt} onChange={(e) => setPrintTxt(e.target.value)} spellCheck={false} />
            <button className="mini" onClick={() => {
              const pares = parsePrint(printTxt);
              if (!pares.length) return;
              const j = { ...draft, fat_labels: pares.map(([k]) => k), fat_vals: pares.map(([, v]) => v) };
              setDraftSync(j);
            }}>↧ Preencher ({parsePrint(printTxt).length} clientes)</button>
          </div>
        )}

        {tab === 'form' && (
          <>
            <p className="painel-sub">Edite cada parte do slide pelos campos abaixo. Onde faltar dado do Excel, preencha com o print do BI — <strong>nunca invente número</strong>. As alterações valem só para este slide e vão nos exports.</p>
            <div className="form-scroll">
              <FriendlyEditor value={draft} onChange={setDraftSync} />
            </div>
            <div className="map-acoes">
              <button className="btn" onClick={salvarDados}>Salvar alterações</button>
              {temOverride && <button className="btn sec" onClick={() => { onLimparDados(); onFechar(); }}>Restaurar valores do Excel</button>}
            </div>
          </>
        )}

        {tab === 'json' && (
          <>
            <p className="painel-sub">Modo avançado: edite os dados desta seção como JSON. Sincroniza com a aba Conteúdo.</p>
            <textarea className="json-editor" value={jsonTxt} onChange={(e) => setJsonSync(e.target.value)} spellCheck={false} />
            {jsonErr && <div className="erro-bar">JSON inválido: {jsonErr}</div>}
            <div className="map-acoes">
              <button className="btn" disabled={!!jsonErr} onClick={salvarDados}>Salvar alterações</button>
              {temOverride && <button className="btn sec" onClick={() => { onLimparDados(); onFechar(); }}>Restaurar valores do Excel</button>}
            </div>
          </>
        )}

        {tab === 'html' && (
          <>
            <p className="painel-sub">Modo avançado: edite o HTML final do slide. Um slide editado aqui <strong>congela</strong> — não se atualiza mais quando os dados/mês mudarem, até restaurar.</p>
            <div className="editor-html-grid">
              <textarea className="json-editor html-editor" value={htmlTxt} onChange={(e) => setHtmlTxt(e.target.value)} spellCheck={false} />
              <div className="preview-mini"><iframe title={`edit-${nn}`} srcDoc={htmlPreview} scrolling="no" /></div>
            </div>
            <div className="map-acoes">
              <button className="btn sec" onClick={() => setHtmlPreview(htmlTxt)}>👁 Atualizar preview</button>
              <button className="btn" onClick={() => { onAplicarHtml(htmlTxt); onFechar(); }}>Salvar HTML</button>
              {temHtmlEdit && <button className="btn sec" onClick={() => { onLimparHtml(); onFechar(); }}>Restaurar gerado</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
