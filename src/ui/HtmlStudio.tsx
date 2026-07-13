/**
 * Estúdio de HTML: sobe arquivos .html prontos (ex.: gerados por IA) e edita
 * dentro do app — de forma VISUAL (clica no texto do slide e digita) ou por
 * CÓDIGO (com preview ao vivo). Exporta ZIP/PDF/PNG igual ao deck.
 * Independe do Excel/ETL.
 */
import { useState, useRef, useEffect } from 'react';
import type { RenderResult } from '../engine/engine';
import { baixarZip, baixarPdf, baixarHtml, baixarImagem, baixarImagensZip, copiarHtml, copiarImagem, type FormatoImg } from './exportar';
import { AjudaFigma } from './figma';

export interface HtmlSlide { file: string; html: string; }
const LS = 'reportbi.htmlstudio.v1';

function carregarSalvos(): HtmlSlide[] {
  try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; }
}

export function HtmlStudio({ iniciais, onVoltar }: { iniciais: HtmlSlide[]; onVoltar: () => void }) {
  // estado inicial: mescla os enviados agora com os salvos (novos sobrescrevem)
  const [slides, setSlides] = useState<HtmlSlide[]>(() => {
    const salvos = carregarSalvos();
    if (!iniciais.length) return salvos;
    const map = new Map(salvos.map((s) => [s.file, s]));
    for (const s of iniciais) map.set(s.file, s);
    return [...map.values()];
  });
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify(slides)); } catch { /* quota */ } }, [slides]);

  const [aberto, setAberto] = useState<number | null>(null);
  const [visual, setVisual] = useState<number | null>(null);
  const [codigo, setCodigo] = useState<number | null>(null);
  const [prog, setProg] = useState('');
  const [ajudaFigma, setAjudaFigma] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null); // `${i}:html` | `${i}:img`
  const marcarCopiado = (chave: string) => { setCopiado(chave); setTimeout(() => setCopiado((c) => (c === chave ? null : c)), 1600); };

  const asResults = (): RenderResult[] => slides.map((s, i) => ({ nn: String(i + 1).padStart(2, '0'), file: s.file, html: s.html }));
  const atualizar = (i: number, html: string) => setSlides((prev) => prev.map((s, j) => (j === i ? { ...s, html } : s)));
  const remover = (i: number) => setSlides((prev) => prev.filter((_, j) => j !== i));

  const adicionar = async (files: File[]) => {
    const novos: HtmlSlide[] = [];
    for (const f of files) {
      if (!/\.html?$/i.test(f.name)) continue;
      novos.push({ file: f.name, html: await f.text() });
    }
    if (!novos.length) return;
    setSlides((prev) => {
      const map = new Map(prev.map((s) => [s.file, s]));
      for (const s of novos) map.set(s.file, s);
      return [...map.values()];
    });
  };

  return (
    <div className="deck-main html-studio">
      <div className="export-bar">
        <button className="btn sec" onClick={onVoltar}>← Voltar</button>
        <label className="btn sec">＋ Adicionar HTML
          <input type="file" multiple accept=".html,.htm" hidden onChange={(e) => { const fs = Array.from(e.target.files ?? []); e.target.value = ''; if (fs.length) adicionar(fs); }} />
        </label>
        {slides.length > 0 && <>
          <button className="btn" onClick={() => baixarZip(asResults())}>⬇ .zip HTML (Figma)</button>
          <button className="btn sec" onClick={() => setAjudaFigma(true)}>▶ Levar pro Figma</button>
          <button className="btn sec" title="Abre a janela de impressão — escolha 'Salvar como PDF'" onClick={() => baixarPdf(asResults())}>🖨 PDF</button>
          <ExportImgBulk onExport={async (tipo) => { await baixarImagensZip(asResults(), tipo, (i, t) => setProg(`${tipo.toUpperCase()} ${i}/${t}…`)); setProg(''); }} disabled={!!prog} />
          {prog && <span className="progresso">{prog}</span>}
        </>}
      </div>

      {slides.length === 0 ? (
        <div className="html-vazio">
          <div className="drop-icone">🧩</div>
          <h2>Suba os HTML para editar</h2>
          <p>Arraste (ou use “＋ Adicionar HTML”) os arquivos <code>.html</code> dos slides — por exemplo os que a IA gerou.<br />
            Você edita cada um <strong>visualmente</strong> (clicando no texto) ou por <strong>código</strong>, e exporta ZIP/PDF/PNG.</p>
        </div>
      ) : (
        <div className="grid-slides">
          {slides.map((s, i) => (
            <div key={s.file + i} className="card-slide">
              <div className="card-head">
                <span className="card-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="card-title" title={s.file}>{s.file}</span>
                <button className="lapis" title="Remover este HTML" onClick={() => remover(i)}>🗑</button>
              </div>
              <div className="thumb" onClick={() => setAberto(i)}>
                <iframe title={s.file} srcDoc={s.html} scrolling="no" loading="lazy" />
              </div>
              <div className="card-acoes">
                <button className="mini mini-edit" onClick={() => setVisual(i)}>🖱 Editar visual</button>
                <button className="mini" onClick={() => setCodigo(i)}>&lt;/&gt; Código</button>
                <button className="mini" onClick={() => setAberto(i)}>Abrir</button>
                <button className="mini" onClick={() => baixarHtml({ nn: String(i + 1), file: s.file, html: s.html })}>⬇ HTML</button>
                <button className="mini" onClick={() => baixarImagem({ nn: String(i + 1), file: s.file, html: s.html }, 'png')}>PNG</button>
                <button className="mini" onClick={() => baixarImagem({ nn: String(i + 1), file: s.file, html: s.html }, 'jpeg')}>JPG</button>
                <button className="mini mini-figma" title="Copiar como imagem — cole no Figma com Ctrl/Cmd+V (grátis, sem plugin)" onClick={async () => { if (await copiarImagem({ nn: String(i + 1), file: s.file, html: s.html })) marcarCopiado(`${i}:img`); }}>{copiado === `${i}:img` ? '✓ colar no Figma' : '📋 Colar no Figma'}</button>
                <button className="mini" title="Copiar o HTML — para o plugin grátis 'HTML to Figma' (Builder.io)" onClick={async () => { if (await copiarHtml({ nn: String(i + 1), file: s.file, html: s.html })) marcarCopiado(`${i}:html`); }}>{copiado === `${i}:html` ? '✓ copiado' : '📋 Figma (HTML)'}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {aberto !== null && slides[aberto] && (
        <div className="modal" onClick={() => setAberto(null)}>
          <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
            <div className="modal-bar">
              <strong>{slides[aberto].file}</strong>
              <span>
                <button className="btn" onClick={() => { setVisual(aberto); setAberto(null); }}>🖱 Editar visual</button>
                <button className="btn sec" onClick={() => setAberto(null)}>Fechar ✕</button>
              </span>
            </div>
            <iframe title="preview" className="frame-full" srcDoc={slides[aberto].html} scrolling="no" />
          </div>
        </div>
      )}

      {visual !== null && slides[visual] && (
        <EditorVisual
          slide={slides[visual]}
          onSalvar={(html) => atualizar(visual, html)}
          onFechar={() => setVisual(null)}
        />
      )}

      {codigo !== null && slides[codigo] && (
        <EditorCodigo
          slide={slides[codigo]}
          onSalvar={(html) => atualizar(codigo, html)}
          onFechar={() => setCodigo(null)}
        />
      )}

      {ajudaFigma && <AjudaFigma onFechar={() => setAjudaFigma(false)} />}
    </div>
  );
}

/** Botão com menu PNG/JPEG para export em lote. */
export function ExportImgBulk({ onExport, disabled }: { onExport: (tipo: FormatoImg) => void; disabled?: boolean }) {
  const [aberto, setAberto] = useState(false);
  return (
    <span className="img-menu">
      <button className="btn sec" disabled={disabled} onClick={() => setAberto((v) => !v)}>⬇ Imagens ▾</button>
      {aberto && (
        <span className="img-menu-pop" onMouseLeave={() => setAberto(false)}>
          <button className="mini" onClick={() => { setAberto(false); onExport('png'); }}>PNG (.zip)</button>
          <button className="mini" onClick={() => { setAberto(false); onExport('jpeg'); }}>JPEG (.zip)</button>
        </span>
      )}
    </span>
  );
}

/** Edição VISUAL: o slide vira editável (designMode) — clica no texto e digita. */
function EditorVisual({ slide, onSalvar, onFechar }: { slide: HtmlSlide; onSalvar: (html: string) => void; onFechar: () => void }) {
  const ref = useRef<HTMLIFrameElement>(null);

  const ativar = () => {
    const d = ref.current?.contentDocument;
    if (!d) return;
    try { d.designMode = 'on'; } catch { /* ignore */ }
  };
  const salvar = () => {
    const d = ref.current?.contentDocument;
    if (d) {
      try { d.designMode = 'off'; } catch { /* ignore */ }
      const doctype = d.doctype ? '<!DOCTYPE html>\n' : '';
      onSalvar(doctype + d.documentElement.outerHTML);
    }
    onFechar();
  };

  return (
    <div className="modal" onClick={onFechar}>
      <div className="modal-inner editor-visual" onClick={(e) => e.stopPropagation()}>
        <div className="modal-bar">
          <strong>🖱 Editar visual — {slide.file}</strong>
          <span className="vis-dica">Clique em qualquer texto do slide e digite. <b>Ctrl+Z</b> desfaz.</span>
          <span className="vis-btns">
            <button className="btn" onClick={salvar}>Salvar alterações</button>
            <button className="btn sec" onClick={onFechar}>Cancelar</button>
          </span>
        </div>
        <div className="visual-scroll">
          <iframe ref={ref} title={`vis-${slide.file}`} className="frame-full" srcDoc={slide.html} onLoad={ativar} />
        </div>
      </div>
    </div>
  );
}

/** Edição por CÓDIGO: textarea do HTML + preview ao vivo. */
function EditorCodigo({ slide, onSalvar, onFechar }: { slide: HtmlSlide; onSalvar: (html: string) => void; onFechar: () => void }) {
  const [txt, setTxt] = useState(slide.html);
  const [preview, setPreview] = useState(slide.html);
  return (
    <div className="modal" onClick={onFechar}>
      <div className="modal-inner editor-html" onClick={(e) => e.stopPropagation()}>
        <div className="modal-bar">
          <strong>&lt;/&gt; Código — {slide.file}</strong>
          <button className="btn sec" onClick={onFechar}>Fechar ✕</button>
        </div>
        <div className="editor-html-grid">
          <textarea className="json-editor html-editor" value={txt} onChange={(e) => setTxt(e.target.value)} spellCheck={false} />
          <div className="preview-mini"><iframe title={`cod-${slide.file}`} srcDoc={preview} scrolling="no" /></div>
        </div>
        <div className="map-acoes">
          <button className="btn sec" onClick={() => setPreview(txt)}>👁 Atualizar preview</button>
          <button className="btn" onClick={() => { onSalvar(txt); onFechar(); }}>Salvar alterações</button>
        </div>
      </div>
    </div>
  );
}
