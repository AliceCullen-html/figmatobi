/** Guia rápido: como levar os slides HTML para o Figma (via plugin html.to.design). */
export function AjudaFigma({ onFechar }: { onFechar: () => void }) {
  return (
    <div className="modal" onClick={onFechar}>
      <div className="modal-inner editor" onClick={(e) => e.stopPropagation()}>
        <div className="modal-bar">
          <strong>▶ Levar os slides para o Figma</strong>
          <button className="btn sec" onClick={onFechar}>Fechar ✕</button>
        </div>
        <p className="painel-sub">
          Os slides são HTML/SVG — no Figma eles entram como <strong>vetor editável</strong> (não imagem)
          usando o plugin gratuito <strong>html.to.design</strong>. Dois caminhos:
        </p>
        <div className="figma-passos">
          <div className="figma-passo">
            <div className="figma-num">A</div>
            <div>
              <strong>Colar o HTML (rápido, 1 slide)</strong>
              <p>No card do slide, clique em <code>📋 Figma</code> (copia o HTML). No Figma, abra o
                plugin <strong>html.to.design</strong> → aba <strong>Import from code / Paste HTML</strong> → cole → Import.</p>
            </div>
          </div>
          <div className="figma-passo">
            <div className="figma-num">B</div>
            <div>
              <strong>Subir os arquivos (o deck todo)</strong>
              <p>Baixe o <code>⬇ .zip HTML</code>, descompacte, e no plugin html.to.design use
                <strong> Import from file</strong> para cada <code>.html</code> (ou arraste).</p>
            </div>
          </div>
        </div>
        <p className="painel-sub">
          Instalar o plugin: no Figma → <em>Menu → Plugins → Browse plugins → “html.to.design”</em>.
          Cada slide vem no tamanho 1440×829, pronto pra ajustar. Para <strong>PNG/JPEG</strong> (imagem
          achatada), use os botões de imagem — mas para editar no Figma, prefira o HTML.
        </p>
      </div>
    </div>
  );
}
