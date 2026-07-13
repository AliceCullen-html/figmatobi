/** Exportação: HTML standalone, ZIP, PDF, PNG e JPEG — 1440×829.
 * A rasterização (PNG/JPEG/PDF) é feita 100% no navegador via SVG
 * <foreignObject> + canvas — sem libs externas e sem depender de fontes/recursos
 * remotos (que travavam o método antigo e geravam imagem em branco).
 * jszip é carregado sob demanda (lazy). */
import type { RenderResult } from '../engine/engine';
import { download } from './state';

const W = 1440;
const H = 829;

export function baixarHtml(slide: RenderResult): void {
  download(slide.file, slide.html, 'text/html;charset=utf-8');
}

export async function baixarZip(slides: RenderResult[], extras: Record<string, string> = {}): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const s of slides) zip.file(s.file, s.html);
  for (const [nome, conteudo] of Object.entries(extras)) zip.file(nome, conteudo);
  const blob = await zip.generateAsync({ type: 'blob' });
  download('deck_cattalini.zip', blob);
}

export type FormatoImg = 'png' | 'jpeg';

/**
 * Rasteriza um slide (1440×829) para PNG/JPEG. Renderiza o HTML dentro de um
 * SVG <foreignObject> e desenha num canvas — técnica nativa do navegador, sem
 * bibliotecas. Remove scripts, <link> e @import de fontes externas para não
 * depender de rede nem "sujar" (taint) o canvas — por isso é robusto e nunca
 * mais sai em branco. As fontes caem para a fonte de sistema; o entregável fiel
 * e editável continua sendo o HTML/SVG.
 */
async function renderParaCanvas(html: string): Promise<HTMLCanvasElement> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // sem scripts, sem folhas/links externos e sem @import — evita CORS e taint
  doc.querySelectorAll('script, link').forEach((e) => e.remove());
  doc.querySelectorAll('style').forEach((s) => { s.textContent = (s.textContent || '').replace(/@import[^;]+;/g, ''); });
  const serial = new XMLSerializer().serializeToString(doc.documentElement);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject x="0" y="0" width="${W}" height="${H}">${serial}</foreignObject></svg>`;
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const img = new Image();
  img.width = W; img.height = H;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('falha ao renderizar o slide para imagem'));
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);
  return canvas;
}

async function renderParaImagem(html: string, tipo: FormatoImg = 'png'): Promise<string> {
  const canvas = await renderParaCanvas(html);
  return tipo === 'jpeg' ? canvas.toDataURL('image/jpeg', 0.95) : canvas.toDataURL('image/png');
}

const ext = (tipo: FormatoImg) => (tipo === 'jpeg' ? '.jpg' : '.png');

// ---------- PDF (montado à mão, imagens JPEG — sem libs, sem janela de impressão) ----------

function base64ParaBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Monta um PDF paisagem, uma página por slide, cada página com o slide como
 * imagem JPEG ocupando a página inteira (mesmas proporções 1440×829). Como a
 * imagem é do tamanho exato da página, **nunca corta elemento** e não depende
 * das configurações da janela de impressão do navegador.
 */
function montarPdfDeJpegs(jpegs: Uint8Array[]): Blob {
  const wPt = +(W * 72 / 96).toFixed(2); // 1080
  const hPt = +(H * 72 / 96).toFixed(2); // 621.75
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  let offset = 0;
  const offsets: number[] = [];
  const put = (d: Uint8Array | string) => { const u = typeof d === 'string' ? enc.encode(d) : d; partes.push(u); offset += u.length; };

  put('%PDF-1.4\n');
  put(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A])); // marcador binário

  const N = jpegs.length;
  const catalogId = 1, pagesId = 2;
  const pageIds: number[] = [], contentIds: number[] = [], imgIds: number[] = [];
  for (let i = 0; i < N; i++) { pageIds.push(3 + i * 3); contentIds.push(4 + i * 3); imgIds.push(5 + i * 3); }

  const obj = (id: number, body: string) => { offsets[id] = offset; put(`${id} 0 obj\n${body}\nendobj\n`); };

  obj(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  obj(pagesId, `<< /Type /Pages /Count ${N} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`);

  for (let i = 0; i < N; i++) {
    const content = `q ${wPt} 0 0 ${hPt} 0 0 cm /Im0 Do Q`;
    obj(pageIds[i], `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${wPt} ${hPt}] /Resources << /XObject << /Im0 ${imgIds[i]} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`);
    obj(contentIds[i], `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    offsets[imgIds[i]] = offset;
    put(`${imgIds[i]} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegs[i].length} >>\nstream\n`);
    put(jpegs[i]);
    put('\nendstream\nendobj\n');
  }

  const totalObjs = 2 + N * 3;
  const xrefStart = offset;
  let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= totalObjs; id++) xref += String(offsets[id]).padStart(10, '0') + ' 00000 n \n';
  put(xref);
  put(`trailer\n<< /Size ${totalObjs + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  return new Blob(partes as BlobPart[], { type: 'application/pdf' });
}

export async function baixarPdf(slides: RenderResult[], onProgress?: (i: number, total: number) => void): Promise<void> {
  const jpegs: Uint8Array[] = [];
  for (let i = 0; i < slides.length; i++) {
    onProgress?.(i + 1, slides.length);
    const url = await renderParaImagem(slides[i].html, 'jpeg');
    jpegs.push(base64ParaBytes(url.split(',')[1]));
  }
  download('deck_cattalini.pdf', montarPdfDeJpegs(jpegs));
}

export async function baixarImagem(slide: RenderResult, tipo: FormatoImg = 'png'): Promise<void> {
  const url = await renderParaImagem(slide.html, tipo);
  const a = document.createElement('a');
  a.href = url;
  a.download = slide.file.replace(/\.html?$/i, ext(tipo));
  a.click();
}

export async function baixarImagensZip(slides: RenderResult[], tipo: FormatoImg = 'png', onProgress?: (i: number, total: number) => void): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (let i = 0; i < slides.length; i++) {
    onProgress?.(i + 1, slides.length);
    const url = await renderParaImagem(slides[i].html, tipo);
    zip.file(slides[i].file.replace(/\.html?$/i, ext(tipo)), url.split(',')[1], { base64: true });
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  download(`deck_cattalini_${tipo}.zip`, blob);
}

// compat: nomes antigos
export const baixarPng = (slide: RenderResult) => baixarImagem(slide, 'png');
export const baixarPngsZip = (slides: RenderResult[], onProgress?: (i: number, total: number) => void) => baixarImagensZip(slides, 'png', onProgress);

/** Copia o HTML do slide para a área de transferência (colar num plugin HTML→Figma). */
export async function copiarHtml(slide: RenderResult): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(slide.html);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copia o slide como IMAGEM (PNG) para a área de transferência — cole direto no
 * Figma com Ctrl/Cmd+V (sem plugin, sem custo). Caminho mais rápido de "jogar
 * direto pra lá". Precisa ser chamado a partir de um clique (gesto do usuário).
 */
export async function copiarImagem(slide: RenderResult): Promise<boolean> {
  try {
    const url = await renderParaImagem(slide.html, 'png');
    const blob = await (await fetch(url)).blob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}
