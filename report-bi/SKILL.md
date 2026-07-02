---
name: report-bi
description: >
  Gera slides HTML analíticos do Power BI Cattalini (branco, navy #14204A, amarelo #F5C400,
  1440×829px, Inter). Use SEMPRE que o usuário mencionar: "gerar slide", "próxima página",
  "gerar report", "criar relatório", "montar no mesmo estilo", deck mensal Cattalini, ou
  quando um .json ou print/imagem de BI for enviado. Fluxo fixo: pedir todas as imagens no início, preencher dados_mes.json, gerar e validar página a página.
---

# Report BI — Cattalini  ·  deck mensal (18 páginas)

Slides HTML 1440×829 importados pro Figma via html.to.design. Cada mês = repetir o deck
com os dados novos. **Objetivo desta skill: gerar rápido, sem redescobrir template nem
errar estilo.**

## ⚡ Fluxo (seguir À RISCA — sem rodeio, sem sair do padrão)

O processo é fixo: **pedir todas as imagens no início → preencher o manifesto → gerar e
validar PÁGINA A PÁGINA → fechar.** Tudo sai de `references/dados_mes.json` via `gerar.py`;
nunca editar HTML por fora.

### PASSO 0 — Pedir TUDO de uma vez (uma única mensagem)
Antes de gerar qualquer coisa, pedir ao usuário os exports/prints do mês, nesta lista.
**Não começar a gerar enquanto faltar item** (ou o usuário dizer "esse não mudou"):

> **Exports JSON:** `resumo-bi.json` (+ `resumo-bi-produtos.json`) do mês.
> **Prints do Power BI (1 imagem por item):**
> 1. **Real × Orçado por grupo** (Fat Real/Orç + TON Real/Orç) → slides 02, 05, 09, 10, 11
> 2. **Clientes × Faturamento** do mês (Top clientes, %part, var aa; nº ativos/novos/perdidos/retenção) → slides 03, 06
> 3. **Clientes × Movimentação** (volume 2026 e 2025 por cliente) → slide 04
> 4. **Curva ABC** — Produto e Cliente (concentração A/B/C) → slides 05, 06
> 5. **Receita Bruta por Serviço** 12M + Contratos >12M + Take or Pay + Ticket → slide 07
> 6. **Espaço Faturado M³** 12M por tipo de contrato → slide 08
> 7. **Market Share** mensal por terminal (13 meses) → slide 12; **MS Derivados** (sem Transpetro) → slide 13; **Soda** (vol mensal) → slide 14
> 8. **Óleo de Soja Degomado** — print Mov + print Fat por cliente (mesmo período) → slide 15
> 9. **Movimentação Transpetro** por produto (2026) → slide 16
> 10. **Top 10 meses de Faturamento** (histórico) → slide 18

Slide 01 (Destaques) é montado dos números do próprio deck — não precisa de print.

### PASSO 1 — Preencher o manifesto
Ler cada imagem e lançar os valores/textos na seção do slide em `references/dados_mes.json`.
Regra dura: **não inventar.** Faltou um número → pedir antes de seguir (Regra de Ouro 8/9).

### PASSO 2 — Gerar e VALIDAR página a página (ordem 01→18)
Para cada slide, na ordem:
1. `python3 gerar.py NN`  (gera só aquele slide em `/mnt/user-data/outputs/`)
2. `present_files` desse arquivo.
3. **Esperar o OK do usuário.** Só avança para o próximo após aprovação.
4. Correção do usuário = aplicar **na hora** no manifesto e regerar **só aquele slide**
   (`python3 gerar.py NN`). Não reconfirmar a spec inteira, não reabrir slides já aprovados.

### PASSO 3 — Fechar
Com todos aprovados: `python3 gerar.py` (deck completo) → salvar `template_slideNN.html`
aprovados → rebuildar `report-bi.skill` (zip da pasta). A `.skill` é o backup durável.

**Inegociável:** copiar o template VERBATIM (só trocar dado) · cores/estilo das Regras de Ouro ·
nunca inventar dado · uma correção = aplica e regera o slide, sem rodeio e sem sair do padrão.

## 🟡 REGRAS DE OURO (não violar — foi o que custou retrabalho)
1. **Copiar o template VERBATIM.** Só trocar dados. Nunca recriar CSS/estilo do zero
   (foi assim que o slide 18 saiu com cor/medalha/callout errados).
2. **Gráfico = Chart.js 4.4.1 via CDN, SEMPRE.** Nunca barras de `<div>`/CSS.
   `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js`
3. **Barra "Orçado" = transparente:** `backgroundColor: cor+'55'`, `borderColor: cor`,
   `borderWidth:1.5`. Trio prev/real/orç: Realizado sólido · Previsão `cor+'B3'` (~70%) ·
   Orçado `cor+'55'` (~33%)+borda.
4. **Cores fixas por grupo (mov/produto/donut):** Metanol `#00B050` · Derivados `#14204A` ·
   Aquecidos `#8A9BB0` · Óleo Vegetal `#F5C400` · Soda Cáustica `#C8D4DF` ·
   Biocombustível `#F0A33A` · Outros `#5A82B5`. Usar SEMPRE, mesmo se o print mostrar outra.
5. **Cores fixas terminais (market share):** Cattalini `#10253F` · Transpetro `#6C809A` ·
   CBL `#FFC000` · Terin `#9BBB59`. Transpetro-mov por produto: Diesel `#14204A` ·
   Bunker `#F5C400` · GLP `#6C809A` · Gasolina `#8A9BB0` · Nafta `#D6DEE8`.
6. **"Louis Dreyfus" → sempre LDC.**
7. **Janela = 13 meses rolantes terminando no mês do relatório** (ciclo maio = Mai/25→Mai/26).
   Meses do ano corrente = navy/destaque; ano anterior = cinza/claro.
8. **NUNCA inventar dado de gráfico.** Não está no JSON → pedir print. Print só do mês →
   não misturar com YTD (e vice-versa). Mov e Fat têm que ser do MESMO período num slide.
9. **% do painel BI "vs ano anterior/2025" são QUEBRADOS** (dão +692% etc.) — nunca usar.
   O mix grande no topo do painel é ACUMULADO de todos os anos, não por ano (ler dos barras).
10. **Callouts do óleo degomado (15): separados por gráfico** — bloco da Mov só fala TON,
    bloco do Fat só fala R$. Nunca misturar. Tag com sufixo "· Volume"/"· Receita".
11. **Market Share Derivados (13) = SEM Transpetro** (Cattalini×CBL×Terin=100%, ler do print).
12. **ABC Cliente (06) = dados MENSAIS** (não YTD; A>R$2,5Mi, ~8 clientes). Acostagem (~R$0)
    fora do pareto/contagem.
13. **Top-meses (18):** header de tabela dourado `#C9B27A` · medalhas 🥇🥈🥉 · callouts com
    FAIXA sólida colorida (alerta `#22426B`/verde `#1E8A5F`/vermelho `#C0392B`).
14. **Após gerar e aprovar:** salvar `references/template_slideNN.html` e rebuildar a skill.

## 📑 Índice de slides (numeração do deck)
| # | Slide | Template | Fonte de dados | Estilo |
|---|-------|----------|----------------|--------|
| 01 | Destaques Comerciais | template_slide01 | resumo-bi.json + produtos + print MARKETSHARE | bold |
| 02 | Faturamento (Real×Orç por grupo) | template_slide02 | JSON + **print REAL X ORÇADO** | bold |
| 03 | Carteira Faturamento Cliente | template_slide03 | **print CLIENTES x FAT (mês)** | bold |
| 04 | Carteira Movimentação Cliente | template_slide04 | **print CLIENTES x MOV (mês)** | bold |
| 05 | Curva ABC Produto (6 cards) | template_slide05 | **print CURVA ABC (Fat x Produto)** | leve 300 |
| 06 | Curva ABC Cliente (mensal) | template_slide06 | **print CURVA ABC (cliente, mês)** | leve 300 |
| 07 | Receita Bruta por Serviço | template_slide07 | **print** (12M rolling) | bold |
| 08 | Espaço Faturado M³ | template_slide08 | **print** (12M rolling) | bold |
| 09 | Mov. Acumulado Jan–Mês | template_slide09 | resumo-bi.json (+ split por grupo do print) | bold |
| 10 | Mov. Mês Histórico | template_slide10 | resumo-bi.json (+ split do print) | bold |
| 11 | Mov. Previsão×Realizado×Orçado | template_slide11 | resumo-bi.json (+ previsão dada) | bold |
| 12 | Market Share Geral | template_slide12 | resumo-bi.json (shares mensais) + mês novo | kpi-bar |
| 13 | Market Share Derivados | template_slide13 | **print MS Derivados** (sem Transpetro) | kpi-bar |
| 14 | Market Share Soda Cáustica | template_slide14 | **print** (vol mensal, 100% Cattalini) | kpi-bar |
| 15 | Óleo de Soja Degomado | template_slide15 | **print Mov + print Fat (mesmo período)** | leve 300, 4 col |
| 16 | Movimentação Transpetro | template_slide16 | **print/tabela Transpetro** (2026) + 2025 do template | leve 300 |
| 17 | (reservado / a definir) | — | — | — |
| 18 | Histórico Top 10 Meses | template_slide18 | resumo-bi.json / print TOP MESES | bold |

**Auto via `gerar.py` (manifesto):** TODAS as 18 páginas (01-16, 18). Edite só `references/dados_mes.json` e rode `python3 gerar.py`.

## Referências
- `references/dados_mes.json` — **manifesto único do mês** (preencher e gerar a partir dele).
- `gerar.py` — gerador. `python3 gerar.py` (deck todo) ou `python3 gerar.py NN` (só o slide NN, p/ validar página a página).
- `references/design-system.md` — CSS/cores/componentes.
- `references/slide-catalog.md` — detalhe e marcadores por slide.
- `references/json-schema.md` — estrutura dos JSONs (campos quebrados etc.).
- `references/template_slideNN.html` — template canônico de cada página (estilo já correto).
- `references/templates-html/` — originais de março (autoridade visual).
