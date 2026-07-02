/** Exportação: HTML standalone (html.to.design), ZIP, PDF e PNG — 1440×829. */
import JSZip from 'jszip';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
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

/** monta o slide num container oculto 1440×829 e rasteriza (para PNG/PDF). */
async function renderParaImagem(html: string): Promise<string> {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-20000px;top:0;width:1440px;height:829px;overflow:hidden;background:#fff;z-index:-1;';
  // remove <script> (não executam via innerHTML) e isola o conteúdo do slide
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script').forEach((s) => s.remove());
  const styles = [...doc.querySelectorAll('style')].map((s) => s.outerHTML).join('');
  const slide = doc.querySelector('.slide')?.outerHTML ?? doc.body.innerHTML;
  host.innerHTML = styles + slide;
  document.body.appendChild(host);
  try {
    // espera fontes carregarem para não rasterizar com fallback
    await (document as any).fonts?.ready;
    return await toPng(host, { width: 1440, height: 829, pixelRatio: 1, backgroundColor: '#ffffff' });
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

export async function baixarPdf(slides: RenderResult[], onProgress?: (i: number, total: number) => void): Promise<void> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1440, 829], compress: true });
  for (let i = 0; i < slides.length; i++) {
    onProgress?.(i + 1, slides.length);
    const png = await renderParaImagem(slides[i].html);
    if (i > 0) pdf.addPage([1440, 829], 'landscape');
    pdf.addImage(png, 'PNG', 0, 0, 1440, 829);
  }
  pdf.save('deck_cattalini.pdf');
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
