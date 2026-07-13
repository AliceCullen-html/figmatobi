# Deck Cattalini — Excel → 18 slides (Figma-ready)

App web **React + Vite + TypeScript, 100% local** (roda no navegador, sem backend), que recebe
o **Excel do Power BI Comercial** e gera automaticamente o deck mensal de **18 slides HTML
1440×829px**, idênticos em estilo aos existentes, prontos para importar no Figma via
`html.to.design`.

Substitui o fluxo manual (preencher `dados_mes.json` na mão → rodar `gerar.py`) por:
**subir Excel → conferir preview → baixar deck.**

---

## Como rodar

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

Build estático (abre offline, sem servidor):

```bash
npm run build      # gera dist/ — abra dist/index.html direto no navegador
```

Testes (inclui o golden-master):

```bash
npx vitest run
```

## Como usar

1. **Upload** — arraste o(s) `.xlsx` do mês na tela inicial. Pode subir o arquivo de
   **Realizado** e o de **Orçamento** juntos. Se já houver um `mapping.config.json`
   compatível salvo, o preview abre direto.
2. **Mapeamento** (só na primeira vez ou se o layout do Excel mudar) — o assistente
   auto-detecta as abas/colunas e mostra um de-para editável
   ("coluna X da aba Y → campo Z do deck"). Confirme, corrija se preciso e baixe o
   `mapping.config.json` para reaproveitar nos próximos meses
   (um exemplo gerado do Excel real está em `mapping.config.example.json`).
3. **Preview do deck** — grade com os 18 slides renderizados. Badge por slide:
   ✅ ok · ⚠️ precisa de override · ⛔ erro de validação. Clique para abrir em 1440×829.
4. **Editar cada slide** — botão **✏️ Editar** no card abre um editor com 3 abas:
   - **📝 Conteúdo** (padrão) — um formulário com cada parte do slide em campos
     rotulados em português (Título, Indicadores, Comentários, Legendas…), seletor
     de cor visual e menus para estilos (positivo/negativo/atenção). **Não precisa
     saber HTML.** Listas têm botões de adicionar/remover.
   - **Dados (JSON)** — modo avançado, sincronizado com o formulário.
   - **HTML** — modo avançado com preview ao vivo (congela o slide até restaurar).

   O painel lateral também lista os campos que o Excel **não entrega com confiança**
   (ex.: faturamento por cliente do óleo degomado). Eles chegam **vazios** — nunca
   inventados (Regra de Ouro 8); preencha no editor (há um atalho para colar do print
   do BI no slide 15) ou marque "sem alteração este mês". Toda edição re-renderiza só
   o slide afetado e vai junto nos exports.
5. **Export** — "Baixar deck .zip" (HTML para `html.to.design`), **PDF** (abre a janela
   de impressão do navegador → escolha *Salvar como PDF*, paisagem, sem margens — sai
   vetorial e com as fontes reais), **PNGs** e `manifesto.json`. O `.zip` inclui manifesto,
   mapping e estado do projeto para reaproveitar no mês seguinte.

### Estúdio de HTML (editar HTML prontos)

Além do fluxo Excel → deck, dá para **subir arquivos `.html` prontos** (ex.: gerados por
IA) e editá-los direto no app, sem Excel: na tela de upload, arraste os `.html` (ou clique
em **🧩 Editor de HTML**). Cada arquivo vira um slide editável, com:

- **🖱 Editar visual** — o slide fica editável na tela (designMode): clique em qualquer
  texto e digite, como no Word (Ctrl+Z desfaz). Ideal para quem não conhece HTML.
- **&lt;/&gt; Código** — edição do HTML com preview ao vivo.
- Export **ZIP / PDF / PNG** igual ao deck. As edições ficam salvas no navegador.

### Toggle SVG ↔ Chart.js

- **SVG (default)** — gráficos como vetor nativo (`<path>`/`<rect>`), editáveis no Figma
  após importar com `html.to.design`. É o entregável do fluxo.
- **Chart.js (fiel ao original)** — a saída canônica do `gerar.py`, para conferência visual.

## Arquitetura

```
Excel (.xlsx)
   → SheetJS: JSON bruto por aba                       src/etl/excel.ts
   → Assistente de Mapeamento (de-para salvo)          src/etl/mapping.ts
   → ETL: regras de negócio → manifesto                src/etl/etl.ts
        · ABC produto/cliente (mensal, Acostagem fora)
        · YTD recalculado somando meses
        · janela 13 meses rolantes
        · "Louis Dreyfus" → LDC · cores fixas
        · campos sem fonte confiável → fila de Overrides
   → Engine (porte fiel de gerar.py)                   src/engine/engine.ts
   → 18 slides HTML 1440×829 (templates VERBATIM)      report-bi/references/
   → Modo SVG p/ Figma                                 src/charts/svg.ts
   → Export HTML/ZIP/PDF/PNG                           src/ui/exportar.ts
```

### Golden-master (a garantia central)

`golden/` guarda os 17 HTML gerados pelo **`gerar.py` original (Python)** sobre o
`report-bi/references/dados_mes.json`. O teste `tests/golden.test.ts` exige que a engine
TypeScript, com o mesmo manifesto, produza HTML **byte a byte idêntico**. Qualquer
divergência é bug do porte — nunca "melhoria". Só com esse teste verde o ETL de Excel
entra em cima.

Para regenerar os goldens (se a skill mudar):

```bash
python3.12 report-bi/gerar.py && cp /mnt/user-data/outputs/*.html golden/
```

## As 14 Regras de Ouro (da skill — travadas no código)

1. Template **VERBATIM** — só troca dado, nunca recria CSS (`src/engine/templates.ts`
   importa direto de `report-bi/references/`).
2. Gráfico fiel — Chart.js 4.4.1 no modo canônico; SVG segue o mesmo layout.
3. Barra "Orçado" transparente: `cor+'55'` fill, borda `cor`, 1.5px. Trio: Realizado
   sólido · Previsão `cor+'B3'` · Orçado `cor+'55'`+borda.
4. Cores fixas por grupo: Metanol `#00B050` · Derivados `#14204A` · Aquecidos `#8A9BB0` ·
   Óleo Vegetal `#F5C400` · Soda Cáustica `#C8D4DF` · Biocombustível `#F0A33A` ·
   Outros `#5A82B5` (`src/etl/format.ts`).
5. Cores fixas terminais: Cattalini `#10253F` · Transpetro `#6C809A` · CBL `#FFC000` ·
   Terin `#9BBB59`.
6. "Louis Dreyfus" → sempre **LDC** (normalização no ETL).
7. Janela = **13 meses rolantes**; ano corrente em navy, anterior em cinza.
8. **Nunca inventar dado** — faltou → vira pendência/override, nunca zero/estimativa.
9. % "vs ano anterior" dos painéis do BI são **quebrados** — o ETL calcula YoY limpo
   (mesmo mês vs mesmo mês, grão mensal do Excel) e nunca usa os % prontos.
10. Callouts do óleo degomado separados por gráfico (Mov = TON, Fat = R$).
11. MS Derivados **sem Transpetro** (Cattalini × CBL × Terin = 100%).
12. ABC Cliente **mensal** (A >R$2,5Mi · B >R$0,8Mi · C demais; Acostagem fora).
13. Top-meses: header dourado `#C9B27A`, medalhas 🥇🥈🥉, callouts em faixa sólida.
14. Marca: Navy `#14204A`, Gold `#F5C400`, Inter (slides), DM Sans/Mono (tabelas).

## Campos quebrados / overrides

O que o Excel **não** entrega com confiança entra na fila de overrides (painel lateral),
nunca no slide com valor cru:

| Campo | Motivo | Onde buscar |
|---|---|---|
| Fat por cliente do óleo degomado (slide 15) | produto degomado não existe no banco de faturamento | print "Fat por cliente" do BI |
| Previsão TON do mês (slide 11) | a aba de projeção em TON do Excel de exemplo só tem 2023 (a de 2026 é m³) | informar previsão ou print |
| Orçado por grupo (slide 02) | vira ⛔ se o Excel de orçamento não for subido | subir o 2º arquivo |

Observação: os "% vs ano anterior" quebrados e o `Fat Orçado` repetido por linha são
defeitos do **export JSON do BI** — aqui o ETL calcula tudo do banco de dados bruto do
Excel (grão mensal), que é limpo, e valida (linhas somam o total, shares somam 100%,
janela com 13 meses).

## Login Microsoft (Cattalini) — opcional

O app pode exigir **login com conta Microsoft corporativa** (Entra ID / Azure AD),
restrito ao tenant da Cattalini. É um fluxo **SPA + PKCE**: roda 100% no navegador,
**sem backend e sem client secret**. Enquanto não for configurado, o app **abre sem
login** (comportamento atual — o deploy não quebra).

### 1. Criar o App Registration (uma vez, no Azure)

No [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**:

- **Name:** `Deck Cattalini`
- **Supported account types:** *Accounts in this organizational directory only* (single tenant)
- **Redirect URI:** plataforma **Single-page application (SPA)** → a URL do app no Vercel
  (ex.: `https://figmatobi.vercel.app`). Adicione também `http://localhost:5173` para testar local.
- Após criar, copie da tela **Overview**: **Application (client) ID** e **Directory (tenant) ID**.

> Importante: a plataforma tem que ser **SPA** (não "Web"). Só a SPA usa PKCE sem secret.
> Se precisar de mais URLs (previews do Vercel), adicione cada uma em Authentication → SPA.

### 2. Configurar as variáveis no Vercel

Em **Vercel → Settings → Environment Variables**, adicione (não vão para o git):

| Variável | Valor |
|---|---|
| `VITE_AZURE_TENANT_ID` | Directory (tenant) ID |
| `VITE_AZURE_CLIENT_ID` | Application (client) ID |
| `VITE_AZURE_ALLOWED_DOMAIN` | *(opcional)* `cattaliniterminais.com.br` — reforça o filtro por e-mail. Aceita lista por vírgula: `cattaliniterminais.com.br,cattalini.com.br` |

Faça **Redeploy**. Pronto: o app passa a pedir "Entrar com Microsoft" e só aceita contas
do tenant da Cattalini (e do domínio, se informado).

Para testar local: copie `.env.example` para `.env.local` e preencha os mesmos valores.

### Como funciona

- Sem `TENANT_ID`+`CLIENT_ID` → login desligado, app aberto.
- Com eles → tela de login antes de tudo; sessão mantida entre reloads (localStorage);
  chip com nome do usuário + botão "Sair" no cabeçalho.
- A `authority` é fixada no tenant da Cattalini, então contas de outros diretórios não logam.
- Observação de segurança: como todo o processamento (Excel → slides) é no navegador e não
  há servidor, esse login é um **portão de acesso à ferramenta** (SSO corporativo), não uma
  proteção de dados no servidor — não existe servidor nem dado da empresa trafegando.

## Estrutura do repositório

```
├── src/                     # app (engine, etl, charts, ui)
├── tests/                   # golden-master + ETL + SVG (29 testes)
├── golden/                  # saída do gerar.py original (autoridade)
├── report-bi/               # a skill original (fonte canônica, intocada)
├── mapping.config.example.json
├── Consolidado_*.xlsx       # Excel real de exemplo (Realizado + Orçamento)
```
