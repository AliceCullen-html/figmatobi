/** Guia: como levar os slides HTML para o Figma — priorizando caminhos GRÁTIS
 * (o plugin html.to.design virou pago; aqui as alternativas sem custo). */
export function AjudaFigma({ onFechar }: { onFechar: () => void }) {
  return (
    <div className="modal" onClick={onFechar}>
      <div className="modal-inner editor" onClick={(e) => e.stopPropagation()}>
        <div className="modal-bar">
          <strong>▶ Levar os slides para o Figma (grátis)</strong>
          <button className="btn sec" onClick={onFechar}>Fechar ✕</button>
        </div>
        <p className="painel-sub">
          O <code>html.to.design</code> passou a cobrar mensalidade. Estas são as formas
          <strong> sem custo</strong> de jogar os slides no Figma — da mais rápida à mais editável:
        </p>
        <div className="figma-passos">
          <div className="figma-passo">
            <div className="figma-num">1</div>
            <div>
              <strong>Colar como imagem (instantâneo, sem plugin)</strong>
              <p>No card do slide, clique em <code>📋 Colar no Figma</code> (copia a imagem PNG).
                No Figma, dê <strong>Ctrl/Cmd&nbsp;+&nbsp;V</strong> no canvas — o slide entra na hora.
                Fica como <em>imagem</em> (não editável por camada), mas é o caminho mais direto e grátis.</p>
            </div>
          </div>
          <div className="figma-passo">
            <div className="figma-num">2</div>
            <div>
              <strong>Arrastar o PNG/JPG (sem plugin)</strong>
              <p>Baixe <code>PNG</code>/<code>JPG</code> (ou <code>⬇ Imagens</code> pro deck todo em .zip)
                e <strong>arraste o arquivo</strong> para dentro do Figma. Também vira imagem achatada.</p>
            </div>
          </div>
          <div className="figma-passo">
            <div className="figma-num">3</div>
            <div>
              <strong>Plugin grátis “HTML to Figma” (editável por camada)</strong>
              <p>Alternativa <strong>open-source e gratuita</strong> ao html.to.design, feita pela
                <strong> Builder.io</strong>. No Figma → <em>Menu → Plugins → Browse plugins</em> → busque
                <strong> “Builder.io” ou “HTML to Figma”</strong> → instale. Depois clique em
                <code> 📋 Figma (HTML)</code> no card (copia o HTML) e cole no plugin, <em>ou</em> baixe o
                <code> ⬇ .zip HTML</code> e importe os arquivos. Aí os slides entram como
                <strong> vetor/texto editável</strong>, 1440×829.</p>
            </div>
          </div>
        </div>
        <p className="painel-sub">
          Resumo: precisa <strong>editar no Figma</strong> → use o plugin grátis da Builder.io (caminho 3).
          Só precisa <strong>colocar a arte lá</strong> → colar a imagem (caminho 1) é o mais rápido.
        </p>
      </div>
    </div>
  );
}
