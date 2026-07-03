/** Exportação: HTML standalone (html.to.design), ZIP, PDF e PNG — 1440×829. */
import JSZip from 'jszip';
import { toPng } from 'html-to-image';
import type { RenderResult } from '../engine/engine';
import { download } from './state';

export function baixarHtml(slide: RenderResult): void {
  download(slide.file, slide.html, 'text/html;charset=utf-8');
}

export async function baixarZip(slides: RenderResult[], extras: Record<string, string> = {}): Promise<void> {
  const zip = new JSZip();
  for (const s of slides) zip.file(s.file, s.html);
  for (const [nome, conteudo] of Object.entries(extras)) zip.file(nome, conteudo);
  const blob = await zip.generateAsync({ type: 'blob' });
  download('deck_cattalini.zip', blob);
}

/**
 * PDF via janela de impressão: cada slide num iframe isolado (sem colisão de
 * CSS), o navegador renderiza nativamente — fontes reais e gráficos SVG como
 * VETOR — e o usuário salva como PDF. Robusto (não depende de rasterização) e
 * mantém a qualidade vetorial, coerente com o alvo Figma.
 */
export function baixarPdf(slides: RenderResult[]): void {
  const win = window.open('', '_blank');
  if (!win) {
    alert('O navegador bloqueou a janela de impressão. Habilite pop-ups para este site e clique em PDF de novo.');
    return;
  }
  const esc = (h: string) => h.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const paginas = slides.map((s, i) => `<div class="pg"><iframe data-i="${i}" srcdoc="${esc(s.html)}"></iframe></div>`).join('');
  const html =
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Deck Cattalini — PDF</title>' +
    '<style>' +
    '@page{size:381mm 219.3mm;margin:0;}' +
    'html,body{margin:0;padding:0;background:#33373f;}' +
    '.pg{width:1440px;height:829px;overflow:hidden;background:#fff;page-break-after:always;}' +
    '.pg:last-child{page-break-after:auto;}' +
    'iframe{width:1440px;height:829px;border:0;display:block;}' +
    '.barra{position:fixed;top:0;left:0;right:0;background:#14204A;color:#fff;font:600 13px system-ui,sans-serif;padding:10px 16px;text-align:center;z-index:9;}' +
    '.barra b{color:#F5C400;}' +
    '@media screen{body{padding-top:44px;}.pg{margin:14px auto;box-shadow:0 4px 18px rgba(0,0,0,.5);}}' +
    '@media print{.barra{display:none;}body{padding-top:0;background:#fff;}.pg{margin:0;box-shadow:none;}}' +
    '</style></head><body>' +
    '<div class="barra">Na janela de impressão escolha: <b>Destino = Salvar como PDF</b> · <b>Layout = Paisagem</b> · <b>Margens = Nenhuma</b>. A impressão abre sozinha…</div>' +
    paginas +
    '<scr' + 'ipt>var fs=document.querySelectorAll("iframe"),n=0,feito=false;' +
    'function imprimir(){if(feito)return;feito=true;try{window.focus();window.print();}catch(e){}}' +
    'if(fs.length===0){imprimir();}else{fs.forEach(function(f){f.addEventListener("load",function(){if(++n===fs.length)setTimeout(imprimir,1200);});});}' +
    'setTimeout(imprimir,9000);</scr' + 'ipt>' +
    '</body></html>';
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/** rasteriza um slide para PNG (conveniência). skipFonts evita travar embutindo
 * fontes externas; o texto sai em fonte de sistema (o entregável fiel é o HTML). */
async function renderParaImagem(html: string): Promise<string> {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-20000px;top:0;width:1440px;height:829px;overflow:hidden;background:#fff;';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script').forEach((s) => s.remove());
  // remove @import de fontes externas — html-to-image trava tentando embuti-las
  const styles = [...doc.querySelectorAll('style')].map((s) => s.outerHTML).join('').replace(/@import[^;]+;/g, '');
  const slide = doc.querySelector('.slide')?.outerHTML ?? doc.body.innerHTML;
  host.innerHTML = styles + slide;
  document.body.appendChild(host);
  try {
    return await toPng(host, { width: 1440, height: 829, pixelRatio: 1, backgroundColor: '#ffffff', skipFonts: true });
  } finally {
    host.remove();
  }
}

export async function baixarPng(slide: RenderResult): Promise<void> {
  const png = await renderParaImagem(slide.html);
  const a = document.createElement('a');
  a.href = png;
  a.download = slide.file.replace('.html', '.png');
  a.click();
}

export async function baixarPngsZip(slides: RenderResult[], onProgress?: (i: number, total: number) => void): Promise<void> {
  const zip = new JSZip();
  for (let i = 0; i < slides.length; i++) {
    onProgress?.(i + 1, slides.length);
    const png = await renderParaImagem(slides[i].html);
    zip.file(slides[i].file.replace('.html', '.png'), png.split(',')[1], { base64: true });
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  download('deck_cattalini_png.zip', blob);
}
