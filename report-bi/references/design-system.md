# Design System — Report BI Cattalini (ESTILO REAL)

> ⚠️ Este documento define o estilo REAL extraído dos templates originais.
> NUNCA inventar variações. Sempre imitar os templates em `templates-html/`.

---

## Dimensões e estrutura base

```css
body { font-family: 'Inter', sans-serif; background: #fff; width: 1440px; }

/* Slide padrão (maioria dos slides) */
.slide { width:1440px; height:829px; background:#fff; padding:40px 64px 32px;
         display:flex; flex-direction:column; overflow:hidden; }

/* Slide ABC (donut + pareto) */
.slide { padding: 44px 72px 40px; }
```

Google Fonts obrigatório:
```html
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');</style>
```

Chart.js obrigatório para gráficos:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
```

---

## Header do slide (padrão)

```html
<div class="slide-tag">Análise Realizado · Terminal Cattalini · Paranaguá</div>
<div class="slide-title">Título do Slide</div>
<div class="gold-rule"></div>
```

```css
.slide-tag   { font-size:10px; font-weight:700; letter-spacing:.10em; text-transform:uppercase; color:#8B92A9; margin-bottom:3px; }
.slide-title { font-size:21px; font-weight:300; color:#14204A; letter-spacing:-.3px; margin-bottom:6px; }
.gold-rule   { height:2px; background:#F5C400; margin-bottom:14px; }
```

⚠️ `font-weight:300` no título (light) — NÃO usar 700.
⚠️ gold-rule = apenas `2px`. SEM navy-rule depois.
⚠️ Slides ABC usam `font-size:22px` no título e `margin-bottom:16px` na gold-rule.

---

## Headline

```html
<div class="headline">
  <div class="hl-main">Texto com <span class="hl-up">positivo</span> e <span class="hl-down">negativo</span></div>
  <div class="hl-sub">subtítulo cinza · contexto</div>
</div>
```

```css
.headline { margin-bottom:12px; }
.hl-main  { font-size:15px; font-weight:400; color:#14204A; line-height:1.4; margin-bottom:3px; }
.hl-up    { color:#0A8F5C; font-weight:600; }
.hl-down  { color:#C93030; font-weight:600; }
.hl-warn  { color:#D08000; font-weight:600; }
.hl-sub   { font-size:11px; color:#8B92A9; }
```

Slides ABC usam `font-size:16px` e `margin-bottom:14px`.

---

## KPI Row (padrão — com kpi-bar colorida)

```html
<div class="kpi-row">
  <div class="kpi">
    <div class="kpi-bar" style="background:#14204A"></div>
    <div class="kpi-lbl">LABEL</div>
    <div class="kpi-val" style="color:#14204A;">59,5 Mi</div>
    <div class="kpi-sub">subtexto</div>
  </div>
</div>
```

```css
.kpi-row { display:flex; gap:0; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid #F0F2F8; }
.kpi     { flex:1; padding-right:22px; border-right:1px solid #E8EAF2; margin-right:22px; }
.kpi:last-child { border-right:none; margin-right:0; padding-right:0; }
.kpi-bar { height:3px; border-radius:2px; margin-bottom:6px; }
.kpi-lbl { font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:.09em; color:#8B92A9; margin-bottom:3px; }
.kpi-val { font-size:26px; font-weight:400; line-height:1; letter-spacing:-.3px; margin-bottom:2px; }
.kpi-sub { font-size:10px; color:#8B92A9; }
```

⚠️ `font-weight:400` no kpi-val (não 700!). Cor no inline style.
⚠️ A `kpi-bar` colorida fica ACIMA do label — é o elemento visual de destaque.
⚠️ Cor da kpi-bar varia por KPI (navy, amarelo, verde, cinza).

---

## Layout body (padrão 2 colunas)

```css
.body { display:grid; grid-template-columns:1fr 240px; gap:36px; flex:1; min-height:0; }
.chart-col { display:flex; flex-direction:column; min-height:0; }
.chart-wrap { flex:1; position:relative; min-height:0; }
.sec-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#8B92A9;
             padding-bottom:6px; border-bottom:1px solid #F0F2F8; margin-bottom:8px; }
.legend-row { display:flex; flex-wrap:wrap; gap:5px 16px; margin-top:8px; }
.leg { display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:#64748b; }
.leg-dot { width:9px; height:9px; border-radius:2px; flex-shrink:0; }
```

---

## Slides ABC — layout especial

```css
/* 3 colunas: donut + pareto + callouts */
.body { display:grid; grid-template-columns:260px 1fr 280px; gap:36px; flex:1; min-height:0; }

/* ABC strip — 6 cards com borda colorida no topo */
.abc-strip { display:flex; gap:0; border:1px solid #E4E7F0; border-radius:6px; overflow:hidden; margin-bottom:18px; }
.abc-card  { flex:1; padding:10px 16px 12px; border-right:1px solid #E4E7F0; position:relative; }
.abc-card::before { content:''; position:absolute; top:0;left:0;right:0; height:3px; }
.ca::before { background:#0A8F5C; }
.cb::before { background:#D08000; }
.cc::before { background:#C93030; }
.sep-v { width:3px; background:#14204A; flex-shrink:0; } /* divisor entre produtos e clientes */
.ac-val { font-size:20px; font-weight:300; color:#14204A; }
```

---

## Pareto bars (slides ABC)

```css
/* Container com overflow:hidden — label DENTRO do fill */
.p-outer { flex:1; height:20px; background:#F4F5FA; border-radius:3px; overflow:hidden; }
.p-fill  { height:100%; border-radius:3px; display:flex; align-items:center; padding-left:7px; }
.p-fill-lbl { font-size:9.5px; font-weight:600; color:#fff; white-space:nowrap; }
```

Cores das barras: `.col-a { background:#14204A }` `.col-b { background:#3D6FCC }` `.col-c { background:#8B92A9 }`

**Largura do fill = % do produto no total (individual, não cumulativo)**
**Classe A usa 100% de largura** (barras A sempre cheias, B e C menores)

---

## Callouts (coluna direita)

```css
.right { display:flex; flex-direction:column; gap:16px; padding-top:2px; }
.callout-tag { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.09em;
               color:#F5C400; background:#14204A; padding:3px 10px;
               display:inline-block; margin-bottom:8px; border-radius:2px; }
.c-items { display:flex; flex-direction:column; gap:8px; }
.c-item  { display:flex; gap:8px; align-items:flex-start; }
.arr     { font-size:13px; flex-shrink:0; line-height:1.45; }
.arr-up{color:#0A8F5C;} .arr-down{color:#C93030;} .arr-warn{color:#D08000;} .arr-neu{color:#8B92A9;}
.c-text  { font-size:11px; color:#2A3060; line-height:1.6; }
.c-text strong { font-weight:600; color:#14204A; }
.rule { height:1px; background:#F0F2F8; }
```

⚠️ `.callout-tag` = SEMPRE navy bg + yellow text. Não inverter.
⚠️ `.c-text` cor é `#2A3060` (azul-escuro), NÃO `#2a2a2a`.

---

## Paleta

```
Navy:         #14204A  (títulos, fundo callout-tag, barras pareto A)
Navy escuro:  #10253F  (barras de gráfico Cattalini)
Amarelo:      #F5C400  (gold-rule, texto callout-tag, leg acento)
Verde:        #0A8F5C  (positivo, hl-up, arr-up)
Vermelho:     #C93030  (negativo, hl-down, arr-down)
Âmbar:        #D08000  (atenção, hl-warn, arr-warn)
Cinza label:  #8B92A9  (slide-tag, kpi-lbl, sec-label)
Cinza texto:  #2A3060  (c-text, corpo de texto)
Fundo linha:  #F0F2F8  (border-bottom kpi-row, rule)
Borda suave:  #E8EAF2  (separadores KPI)
```

---

## Templates de referência (pasta templates-html/)

| Arquivo | Slide |
|---------|-------|
| `slide_destaques_marco2026__1_.html` | Destaques (layout especial com caixa navy esquerda) |
| `slide_abc_donut__3_.html` | Curva ABC — Fat. por Produto (donut + pareto) |
| `slide_abc_cliente__1_.html` | Curva ABC — Fat. por Cliente (donut + pills) |
| `slide_mov_acumulado__1_.html` | Movimentação Acumulado (barras empilhadas Chart.js) |
| `slide_mov_marco_historico__1_.html` | Movimentação Histórico (barras por ano) |
| `slide_previsao_orcado__1_.html` | Previsão x Orçado (3 barras: prev/real/orc) |
| `slide_m3_faturado__1_.html` | Espaço Faturado M³ (barras empilhadas) |
| `slide_market_share__3_.html` | Market Share Geral (barras empilhadas 100%) |
| `slide_ms_derivados__3_.html` | Market Share Derivados (mesma estrutura) |
| `slide_ms_soda_caustica__1_.html` | Market Share Soda Cáustica (100% Cattalini) |
| `slide_transpetro_mov__1_.html` | Movimentação Transpetro (barras empilhadas) |
| `slide_carteira_oleo_vegetal__3_.html` | Carteira Óleo Vegetal (2 barras horizontais) |

---

## Regra absoluta

**Antes de gerar qualquer slide, ler o template mais próximo em `templates-html/` e imitar o HTML/CSS exatamente. Só trocar os dados.**
