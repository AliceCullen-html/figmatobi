# Catálogo de Slides — Report BI Cattalini

Estrutura detalhada de cada slide. Ler apenas o slide que vai ser gerado.

---

## Slide 01 — Destaques Comerciais

**Subtítulo:** "Destaques Comerciais — [Mês Ano]"
**Layout:** header + 4 KPIs linha + corpo 2 colunas (bullets à esquerda, label lateral à direita)

**Coluna esquerda (corpo principal):**
- Headline grande colorida: "[Faturamento X,X acima/abaixo da meta]" em verde/vermelho
- Sub-headline cinza: contexto de mercado (1 linha)
- 3–4 bullet points principais, cada um com sub-bullets (estilo list com dash)
  - Bullet 1: Faturamento — valor, % vs orçado, ticket médio
    - Sub: Volume — valor, % vs orçado
    - Sub: Espaço faturado (se disponível)
  - Bullet 2: Market share — % YTD, variação pp vs ano anterior
    - Sub: terminal perdendo share
    - Sub: novos clientes (se disponível)
  - Bullet 3: Grupo destaque positivo — variação % vs orçado
    - Sub: Take or Pay % da receita (se disponível)
  - Bullet 4: Grupo com ação necessária — variação % vs orçado

**Coluna direita (label lateral):**
- Box navy com: "TERMINAL · PARANAGUÁ" (label) + "Principais destaques do mês" + "[mês/ano]" em amarelo grande

**Nota:** Este slide requer dados de produto/cliente além do JSON de terminais para ser completo.
Com apenas o JSON de terminais, gerar versão simplificada focada em Fat, Mov e Share.

---

## Slide 02 — Faturamento

**Subtítulo:** "RESULTADOS COMERCIAIS · TERMINAL CATTALINI · PARANAGUÁ"
**Título:** "Faturamento"
**Headline:** "[mês/ano] Faturamento [+X,X% acima/abaixo] da meta — volume [+/-X,X%] vs. orçado"
**Sub-headline:** Contexto de mercado em cinza

**4 KPIs no topo (sem borda, espaçados):**
- FAT. REALIZADO → valor grande (R$ XX,X Mi)
- MOVIMENTAÇÃO → valor grande (XXX kTON) com variações
- TICKET MÉDIO / TON → R$ XXX,XX (se disponível)
- % ATINGIMENTO → XX,X%

**Tabela central "Realizado vs. Orçado":**
Colunas: GRUPO | ABC | FAT.REAL | FAT.ORC. | VAR.R$ | TON REAL | TON ORC. | VAR. MOV
Grupos: Metanol, Derivados, Aquecidos, Oleo Vegetal, Soda Cáustica, Biocombustíveis, Outros + **Total** em bold
Badges ABC: A (navy), B (cinza-azulado), C (cinza claro)

**Dois waterfall charts lado a lado (SVG):**
- Esquerdo: Waterfall Faturamento (R$ Mi) — grupos como variações sobre o orçado
- Direito: Waterfall Movimentação (kTON) — mesma estrutura

**Callouts direita:**
- "O QUE AJUDOU" (tag amarela) + bullets ↑
- "O QUE PRESSIONOU" (tag navy) + bullets ↓

**Nota:** Requer dados de produto. Com JSON de terminais apenas, gerar versão com série histórica de Fat e share por terminal em vez de tabela por grupo.

---

## Slide 09 — Movimentação Acumulado Jan–Mês

**Subtítulo:** "ANÁLISE REALIZADO · TERMINAL CATTALINI · PARANAGUÁ"
**Título:** "Movimentação por Categoria de Produto · Acumulado Jan–[Mês]"
**Headline:** "20XX acumula X.XXX,X kTON em Jan–[Mês] — [+/-X,X%] vs [ano ant] e [+/-X,X%] vs orçado"

**6 KPIs no topo:**
- MOV. YTD XXXX
- ORÇADO JAN–[MÊS]/XX
- GAP VS ORÇADO
- DERIVADOS + ÓLEO VEG. (% do volume)
- VS JAN–[MÊS]/[ANO ANT]
- MAIOR VOLUME (terminal/cliente)

**Gráfico de barras empilhadas (SVG/Canvas):**
- Eixo X: anos (2023, 2024, 2025, 2026, Orçado Jan–[mês]/26)
- Empilhado por grupo de produto (cores fixas)
- Valores totais acima de cada barra

**Callouts direita:**
- "CRESCIMENTO [ANO]" + "VS ORÇADO — ATENÇÃO" + "CONTEXTO HISTÓRICO"

**Com JSON de terminais:** usar terminais (Cattalini, CBL, Terin, Transpetro) no lugar de grupos de produto.

---

## Slide 10 — Movimentação Histórico Mensal

**Título:** "Movimentação por Categoria · [Mês] Histórico"
**Headline:** "[Mês]/[Ano]: XXX,Xk TON — [+/-X,X%] vs [mês ano ant] e [+/-X,X%] vs orçado"

**6 KPIs:** MAR/XX REAL | ORÇADO | VS ANO ANT | VS ANO PICO | GRUPO LÍDER | GRUPO DETRATOR

**Gráfico de barras empilhadas:**
- Eixo X: mesmo mês por ano (ex: mar/23, mar/24, mar/25, mar/26, Orçado mar/26)
- Empilhado por terminal (com JSON de terminais) ou por produto

**Callouts:** "CONTEXTO HISTÓRICO" + "[MÊS]/[ANO] VS ORÇADO"

---

## Slide 11 — Movimentação Previsão x Orçamento

**Título:** "Movimentação [Mês] [Ano] (t) – Previsão x Orçamento"
**Headline:** "Previsão XXX,X TON — [+/-X,X%] [acima/abaixo] do orçado (XXXk)"

**6 KPIs:** PREVISÃO | ORÇADO | GAP | MAIOR GAP (grupo) | ÚNICO ACIMA (grupo) | REALIZADO

**Gráfico de 3 barras empilhadas:**
- Previsão | Realizado | Orçado
- Cada barra empilhada por produto/terminal

**Callouts:** "PREVISÃO VS ORÇADO" + "REALIZADO SUPEROU PREVISÃO" + "AÇÃO NECESSÁRIA"

---

## Slide 12 — Market Share — Geral

**Subtítulo:** "MARKET SHARE · GRANÉIS LÍQUIDOS · PARANAGUÁ · %/T"
**Título:** "Market Share"
**Headline:** "Cattalini encerra [mês] em XX% — [contexto de variação]"

**6 KPIs no topo:**
- CATTALINI — [MÊS/ANO]: XX%
- CATTALINI — MÍN./MÁX.: XX% → XX%
- TRANSPETRO — [MÊS/ANO]: XX%
- CBL — [MÊS/ANO]: XX%
- TERIN — [MÊS/ANO]: XX%
- CATTALINI — YTD: XX%

**Gráfico de barras empilhadas 100% (SVG):**
- Eixo X: 13 meses (mar/25 → mar/26 ou similar)
- Empilhado: Cattalini (navy) | Transpetro (amarelo) | CBL (cinza-azul) | Terin (cinza claro)
- Volume total do mercado acima de cada barra (ex: 845K, 870K...)
- % de cada terminal dentro da barra
- Legenda embaixo

**Callouts direita:**
- "CATTALINI" (tag amarela) + bullets com evolução de share
- "COMPETIDORES" (tag cinza) + bullets sobre Transpetro, CBL, Terin
- "OPORTUNIDADE" (tag verde/amarela) + bullet sobre terminal perdendo share

---

## Slide 17 — Projeção

**Título:** "Projeção [Ano] — Orçado"
**Headline:** "Orçado restante [Ano]: R$ X,X Bi — [X] meses · Aceleração a partir de [mês]"

**KPIs:** Fat Orçado restante | Mov Orçada restante | Média mensal orçada | Melhor mês orçado

**Tabela de meses futuros:**
Colunas: MÊS | FAT. ORÇADO | MOV. ORÇADA | vs MÉDIA YTD
Badge "PROJETADO" amarelo ao lado de cada linha

**Gráfico de linha ou barras** com meses futuros — visual diferenciado (barras tracejadas ou cor mais clara)

**Callouts:** contexto do orçado vs realizado acumulado

---

## Cores fixas por terminal

```
Cattalini:  #14204A  (navy)
Transpetro: #F5C400  (amarelo)
CBL:        #6C809A  (cinza-azul)
Terin:      #D6DEE8  (cinza claro)
Liquipar:   #a855f7  (roxo)
```

## Cores fixas por grupo de produto

```
Metanol:         #14204A
Derivados:       #F5C400
Aquecidos:       #6C809A
Óleo Vegetal:    #8A9BB0
Soda Cáustica:   #D6DEE8
Biocombustíveis: #ef4444
Outros:          #E8EAF2
```

---

## Slide 03 — Carteira — Faturamento por Grupo de Cliente

**Subtítulo:** "ANÁLISE DE CARTEIRA · TERMINAL CATTALINI · PARANAGUÁ"
**Título:** "Carteira — Faturamento por Grupo de Cliente"
**Headline:** "Grupo A concentra X% do faturamento — taxa de retenção XX,X%, [acima/abaixo] do referencial de 85%"

**JSON necessário:** `resumo-bi-clientes.json`
**Campos:** `Realizado_Faturamento[GRUPO DE CLIENTE]`, `Realizado_Faturamento[GRUPO DE PRODUTOS]`, `[Fat Realizado]`, `[Fat Orcado]`, `[Mov Realizada]`, `[Mov Orcada]`

### KPIs (6 no topo)
- GRUPO A — FAT: R$ X,X Mi (X% do total)
- GRUPO B — FAT: R$ X,X Mi (X% do total)
- GRUPO C — FAT: R$ X,X Mi (X% do total)
- GRUPOS ACIMA DO ORC.: X de Y grupos
- % ATINGIMENTO: XX,X%
- MOV. TOTAL: XXX,Xk TON

### Layout corpo (2 colunas)
**Coluna esquerda:**
- Tabela por GRUPO DE CLIENTE × GRUPO DE PRODUTOS
  - Colunas: GRUPO CLIENTE | GRUPO PRODUTO | FAT.REAL | FAT.ORC. | VAR.R$ | TON REAL | TON ORC. | VAR.MOV
  - Badges ABC por grupo de cliente (mesmas cores: A=#D4EDDA/#1E7E34, B=#FFF3CD/#856404, C=#FDE2E2/#C0392B)
  - Linha de subtotal por grupo de cliente (negrito, fundo #F7F8FB)
  - Linha TOTAL final

**Coluna direita:**
- Callout "GRUPO A" (tag amarela) + bullets ↑↓→
- Callout "GRUPO B" (tag navy) + bullets
- Callout "ATENÇÃO" se algum grupo muito abaixo do orçado

### Cálculos Python necessários
```python
# Filtrar abril 2026
abr26 = [r for r in rows if r.get("dCalendario[ANO]")=="2026" and r.get("dCalendario[MêsNum]")==4]
abr25 = [r for r in rows if r.get("dCalendario[ANO]")=="2025" and r.get("dCalendario[MêsNum]")==4]

# Agrupar por GRUPO DE CLIENTE
grupos_cli = {}
for r in abr26:
    gc = r.get('Realizado_Faturamento[GRUPO DE CLIENTE]', 'N/A')
    gp = r.get('Realizado_Faturamento[GRUPO DE PRODUTOS]', 'N/A')
    key = (gc, gp)
    if key not in grupos_cli:
        grupos_cli[key] = {'fat_r':0,'fat_o':0,'mov_r':0,'mov_o':0}
    grupos_cli[key]['fat_r'] += r.get('[Fat Realizado]',0)
    grupos_cli[key]['fat_o'] += r.get('[Fat Orcado]',0)
    grupos_cli[key]['mov_r'] += r.get('[Mov Realizada]',0)
    grupos_cli[key]['mov_o'] += r.get('[Mov Orcada]',0)

# Subtotais por grupo de cliente
subtotais = {}
fat_total = 0
for (gc, gp), v in grupos_cli.items():
    if gc not in subtotais:
        subtotais[gc] = {'fat_r':0,'fat_o':0,'mov_r':0,'mov_o':0}
    for k in ['fat_r','fat_o','mov_r','mov_o']:
        subtotais[gc][k] += v[k]
    fat_total += v['fat_r']

# % participação de cada grupo
for gc, v in subtotais.items():
    v['pct'] = v['fat_r']/fat_total*100
```

### Marcadores do template (slide 03)
```
%%MES_ANO%%         → "Abril 2026"
%%A_FAT_R%%         → Fat. Real Grupo A (R$ X,XMi)
%%A_FAT_O%%         → Fat. Orc. Grupo A
%%A_PCT%%           → % do total Grupo A
%%B_FAT_R%%         → Fat. Real Grupo B
%%B_FAT_O%%         → Fat. Orc. Grupo B
%%B_PCT%%           → % do total Grupo B
%%C_FAT_R%%         → Fat. Real Grupo C
%%C_FAT_O%%         → Fat. Orc. Grupo C
%%C_PCT%%           → % do total Grupo C
%%TOT_FAT_R%%       → Fat. Real Total
%%TOT_FAT_O%%       → Fat. Orc. Total
%%ATING%%           → % Atingimento
[+ linhas da tabela por grupo × produto]
```

---

## Slide 03 — Carteira — Faturamento Cliente

**Subtítulo:** "ANÁLISE DE CARTEIRA · TERMINAL CATTALINI · PARANAGUÁ"
**Título:** "Carteira — Faturamento Cliente"

**JSON necessário:** dados manuais via print (SUMMARIZECOLUMNS falha no Automate)
**Dados de KPI disponíveis via EVALUATEROW** (quando implementado):
- Clientes Ativos, Novos, Perdidos, Em Risco, Taxa Retenção, Fat Top 3

### 6 KPIs (compactos)
| KPI | Exemplo abr/26 | Cor |
|-----|---------------|-----|
| Clientes Ativos | 51 | navy |
| Clientes Novos | 10 (8 reais · 4 retornos) | verde |
| Clientes Perdidos | 9 (5 churn · 4 c/ orç.) | vermelho |
| Em Risco | 9 | âmbar |
| Taxa Retenção | 82,0% | âmbar |
| Fat. Top 3 | R$ 17,1 Mi (29%) | navy |

### Tabela Top 10
Colunas: # | CLIENTE | GRUPO PROD. | CLS (badge ABC) | [barra] | FAT.REAL | % PART. | VAR.AA | ORÇADO | VAR.ORC.

**Cores das barras por grupo produto:**
- Metanol: `#14204A` | Derivados: `#F5C400` | Aquecidos: `#6C809A`
- Soda Cáustica: `#D6DEE8` | Óleo Vegetal: `#8A9BB0` | Biocombustíveis: `#ef4444`

**Largura da barra = (Fat Real do cliente / Fat Real do #1) × 100%**

**ABC (threshold mensal):** A = Fat > R$2,5Mi | B = R$750k–2,5Mi | C = abaixo R$750k

### Callouts (4 blocos)
1. Tag amarela **"Risco Moderado"** — contexto geral
2. Tag vermelha **"Maior Risco"** — cliente(s) em queda crítica
3. Tag verde **"Oportunidade"** — clientes crescendo >20%
4. Tag navy **"Prioridades de Ação"** — lista numerada 1/2/3 com círculos navy

### Marcadores principais
```
%%MES_ANO%%           → "Abril 2026"
%%MES_ANO_ANT%%       → "abr/2025"
%%CLI_ATIVOS%%        → 51
%%CLI_NOVOS%%         → 10
%%CLI_NOVOS_REAIS%%   → 8
%%CLI_RETORNOS%%      → 4 (novos que já foram clientes antes)
%%CLI_PERDIDOS%%      → 9
%%CLI_CHURN%%         → 5 (perdidos sem orçado)
%%CLI_ORC_PERDIDOS%%  → 4 (perdidos que tinham orçado)
%%CLI_RISCO%%         → 9
%%TAXA_RETENCAO%%     → 82,0
%%FAT_TOP3%%          → 17,1
%%FAT_TOP3_PCT%%      → 29
%%CLI_PERDIDOS_FAT%%  → 4,1
[+ dados de cada cliente C01–C10: nome, grupo, fat, pct, var_aa, orc, var_orc]
```

---

## Slide 04 — Carteira — Movimentação Cliente

**Subtítulo:** "ANÁLISE DE CARTEIRA · TERMINAL CATTALINI · PARANAGUÁ"
**Título:** "Carteira — Movimentação Cliente"
**Período:** YTD (Jan–Mês do relatório), não só o mês atual

**Fonte:** Print do BI (aba "CLIENTES x MOV"), filtrado pelo período YTD

**Pedir ao usuário:**
```
Para o slide de Carteira — Movimentação Cliente, manda o print completo
da aba "CLIENTES x MOV" no Power BI, com ANO=2026 e todos os meses
do YTD visíveis (tabela Top 10+ e os 4 KPIs no topo).
```

### 4 KPIs
| KPI | Exemplo jan–abr/26 |
|-----|--------------------|
| Mov. Realizada YTD | 1.799,5 kTON (▲14,4% aa) |
| Maior Volume (cliente nome) | IPIRANGA · 328,4k · 18,3% |
| Ticket Médio / TON | R$ 132,37 (▼11,4% aa) |
| Gap vs. Orçado | −10,5 kTON (Ating. 99,4%) |

### Tabela Top 10
Colunas: # | CLIENTE | GRUPO | CLS | [barra] | 2026 (TON) | 2025 (TON) | VAR. AA

**Largura da barra = (VOL cliente / VOL do #1) × 100%**

**Cores das barras por grupo:**
- Óleo Diesel / Derivados: `#F5C400`
- Metanol: `#14204A`
- Óleo de Soja / Óleo Vegetal: `#8A9BB0`
- Estearina / Palma: `#8A9BB0`
- Soda Cáustica: `#D6DEE8`
- Biocombustíveis: `#ef4444`

### Callouts (4 blocos)
1. Tag vermelha **"Risco Elevado"** — exposição em kTON + novos compensando
2. Tag vermelha **"Maior Risco"** — 2-3 clientes em queda crítica
3. Tag verde **"Oportunidade"** — clientes crescendo >20%
4. Tag navy **"Prioridades de Ação"** — lista 1/2/3

### Marcadores principais
```
%%PERIODO%%           → "YTD Jan–Abr/2026"
%%PERIODO_ANT%%       → "jan–abr/2025"
%%MES_ANO%%           → "Abril 2026"
%%ANO%%               → "2026"
%%MESES%%             → "01, 02, 03, 04"
%%MOV_TOTAL%%         → 1.799,5
%%MOV_SINAL%%         → ▲ ou ▼
%%MOV_VAR_AA%%        → 14,4
%%MAIOR_VOL_CLIENTE%% → IPIRANGA
%%MAIOR_VOL%%         → 328,4
%%TICKET%%            → 132,37
%%TICKET_VAR%%        → 11,4
%%GAP_ORC%%           → −10,5
%%ATING%%             → 99,4
%%PCT_DERIV_OLEO%%    → 68%
[+ R01–R10: nome, grupo, vol 2026, vol 2025, var aa, classe]
```

---

## Slide 05 — Curva ABC — Faturamento por Produto

**Subtítulo:** "ANÁLISE PARETO · TERMINAL CATTALINI · PARANAGUÁ"
**Título:** "Curva ABC — Faturamento por Produto"
**Fonte:** `resumo-bi-produtos.json` (sem necessidade de print)

### Cálculo ABC (Python)
```python
produtos_sorted = sorted(abr26_p, key=lambda r: r['[Fat Realizado]'], reverse=True)
total = sum(r['[Fat Realizado]'] for r in produtos_sorted)
cum, abc = 0, {}
for r in produtos_sorted:
    g = r['Realizado_Faturamento[GRUPO DE PRODUTOS]']
    cum += r['[Fat Realizado]'] / total * 100
    abc[g] = 'A' if cum <= 70 else ('B' if cum <= 90 else 'C')
```

### Layout (3 colunas)
- **Col 1 (~210px):** Donut Canvas (produto cores) + legenda com %
- **Col 2 (flex):** Tabela Pareto — PRODUTO | ABC badge | barra cumulativa gradiente | ACUM% | VAR ORC | VAR AA
- **Col 3 (~272px):** Callouts — Alerta (âmbar) + Positivos (verde) + Ação (vermelho)

### 6 KPI Cards (topo)
3 por produto (A/B/C) + 3 por cliente (A/B/C)
- Card colorido: borda+fundo suave (verde/âmbar/vermelho)
- Valor: R$ X,XMi | X% · N produtos/clientes

### Barra Pareto Cumulativa
Usar `linear-gradient` mostrando cada produto em sua cor na posição cumulativa:
```css
background: linear-gradient(to right,
  #F5C400 30.8%,        /* Derivados até 30.8% */
  #14204A 30.8% 60.9%,  /* Metanol de 30.8 a 60.9% */
  #6C809A 60.9% 74.6%,  /* Aquecidos */
  #8A9BB0 74.6% 87.7%,  /* Óleo Vegetal */
  ...
)
```

### Marcadores principais
```
%%MES_ANO%%      → Abril 2026
%%FAT_TOTAL%%    → 59,0
%%A_FAT%%        → 35,9   %%A_PCT%%  → 61   %%A_N%% → 2
%%B_FAT%%        → 15,9   %%B_PCT%%  → 27   %%B_N%% → 2
%%C_FAT%%        → 7,2    %%C_PCT%%  → 12   %%C_N%% → 3
%%CA_FAT%%       → 32,8   %%CA_PCT%% → 55   %%CA_N%% → 7
%%CB_FAT%%       → 19,8   %%CB_PCT%% → 33   %%CB_N%% → 14
%%CC_FAT%%       → 6,9    %%CC_PCT%% → 12   %%CC_N%% → 30
[+ por produto: fat_r, fat_o, var_orc, var_aa, pct, cum, abc, cor]
```

---

## Slide 06 — Curva ABC — Faturamento por Cliente

**Fonte:** Print do BI (aba CURVA ABC → FAT X CLIENTE), filtrado pelo mês
**Pedir:** Print completo com headline, 6 KPIs e a lista de clientes por nível A/B/C visível

### Layout
- Col 1 (~185px): Donut A/B/C (verde/amarelo/vermelho) + legenda com 3 níveis
- Col 2 (flex): Distribuição por Nível — Nivel A / B / C com badges de cliente
- Col 3 (~262px): Callouts

### Badges de cliente
```css
/* Tags coloridas por nível com borda suave */
.cli-tag { padding:2px 7px; border-radius:12px; font-size:9.5px; }
.cli-a   { background:#F0FAF4; color:#1E7E34; border:1px solid #D4EDDA; }
.cli-b   { background:#FFFBF0; color:#856404; border:1px solid #FFF3CD; }
.cli-c   { background:#FEF8F8; color:#C0392B; border:1px solid #FDE2E2; }
.cli-new { font-size:8px; color:#0A8F5C; font-weight:700; } /* badge "novo" */
```

### Donut cores
- A: #0A8F5C (verde)
- B: #F5C400 (amarelo)
- C: #C0392B (vermelho)

### Marcadores
```
%%MES_ANO%%    → Abril 2026
%%FAT_TOTAL%%  → 59,5Mi
%%A_CLI_N%%    → 7     %%A_CLI_FAT%% → 33,1Mi  %%A_CLI_PCT%% → 55
%%B_CLI_N%%    → 15    %%B_CLI_FAT%% → 19,1Mi  %%B_CLI_PCT%% → 33
%%C_CLI_N%%    → 29    %%C_CLI_FAT%% → 7,1Mi   %%C_CLI_PCT%% → 12
[+ lista de clientes A, B, C com flag "novo"]
```

---

## Slide 07 — Receita Bruta por Serviço (precisa de PRINT)

**Título:** "Receita Bruta por Serviço (R$ x 1.000)" (bold, gold 3px + navy 1px). Valores em R$ x 1.000.
**Base:** YTD jan–mês + 12 meses móveis (12M rolling). **Fonte:** print da aba ANÁLISE REALIZADO › Receita Bruta por Serviço.

**6 KPIs (canônico):** Fat. YTD Jan–Mês | Ticket/TON | Ticket/M³ | Contratos >12M (%) | Take or Pay (%) | **Espaço M³ YTD (m³, com var aa)**. (No print "ao vivo" pode aparecer Mov no lugar do Espaço M³ — o deck usa Espaço M³.)

**Gráfico:** barras empilhadas (CSS divs), 12 meses móveis, rótulo = total cheio (ex.: 67.879). Serviços (bottom→top): Take or Pay #14204A | Des/Embarque #3D6FCC | SOP #F5C400 | Outros Serviços #F0A33A | Excedente/2ºGiro #C8D4DF. **Legenda horizontal embaixo.** Split mensal não é exportado → usar mix 12M + nota de rodapé.

**Painel lateral = CALLOUTS** (não composição): "Base Contratual" (navy) ↑ + "Atenção" (gold) ↓→ + "Top Cliente" (navy) → maior faturador YTD. Estilo ctag + c-items/arrows como 02/03.


## Slide 08 — Espaço Faturado M³ (precisa de PRINT)
**Título:** "Espaço Faturado M³" (bold, gold 3px + navy 1px). Mesmo design do slide 07.
**Base:** 12M Rolling (12 meses móveis), barras mensais por tipo de contrato. NÃO é YTD de 5 meses — usar a view "12M Rolling". **Fonte:** print da aba "Espaço Faturado M³".
**6 KPIs:** Espaço Médio YTD (m³, var aa) | mês atual | Maior mês | >12 Meses (%) | Embarque/Des (%) | Excedente (%).
**Gráfico:** barras empilhadas (CSS divs, preenchendo altura, eixo Y 0–1,0M, grade tracejada), por tipo de contrato (bottom→top): >12 meses #14204A | <12 meses #A8C4FF | Embarque/Desembarque #3D6FCC | Excedente #C8D4DF. Legenda embaixo. Split mensal não exportado → usar mix YTD + nota.
**Painel = CALLOUTS:** "Expansão" (navy) ↑ + "Migração de mix" (gold) ↓↑ + "Excedente" (navy) ↑.

# === NOTAS NOVAS (estilo treinado) ===

## Slide Óleo de Soja Degomado – Exportação (Carteira Óleo Vegetal · pág. 15)
- Layout **4 colunas**: `grid-template-columns:1fr 185px 1fr 185px` → [gráfico Mov | callouts Mov | gráfico Fat | callouts Fat].
- **REGRA (treinada por JONGA):** callouts SEMPRE separados por gráfico. O bloco de callouts ao lado da Movimentação fala **só de TON/volume**; o bloco ao lado do Faturamento fala **só de R$/receita**. NUNCA misturar TON e R$ no mesmo bloco. Tag do callout traz o sufixo "· Volume" ou "· Receita".
- Dois gráficos Chart.js horizontais (`indexAxis:'y'`), top 3 em cor cheia, resto color+'AA', barLabelPlugin (Mov: "149.5k"; Fat: "R$9.28Mi"). Mov navy #14204A, Fat gold #F5C400.
- 6 KPIs (título leve 300, slide-tag). "Louis Dreyfus" → sempre **LDC**.
- Template de referência: `references/templates-html/slide_carteira_oleo_vegetal__3_.html` e `references/template_slide15.html`.

## Slide Histórico — Top 10 Meses (pág. 18)
- Família "resultados": slide-label uppercase + título BOLD navy 22px + gold-rule 3px + navy-rule 1px. Padding 40px 64px 32px. Nº da página (ex. "18") no canto inferior direito.
- Headline NAVY (sem verde/vermelho) — só negrito nos termos-chave; cauda "· sinal de..." em cinza #8B92A9.
- Body grid `1fr 1fr 256px`: tabela Top 10 Volume (TON) | tabela Top 10 Faturamento (R$) | coluna de 3 callouts.
- Tabelas: header navy full-row com texto DOURADO/tan #C9B27A (NÃO branco). Top 3 com medalha emoji 🥇🥈🥉 e mês em bold navy; #4–#10 com "#N" cinza e mês em cinza #6B7280. Valores à direita navy 600. Linhas uniformes (sem tint na top 3).
- Callouts: cada box tem FAIXA DE CABEÇALHO SÓLIDA colorida (texto branco) + corpo com tint claro. Concentração·Alerta = header #22426B / corpo #F5F8FC; Destaques Positivos = header #1E8A5F / corpo #EDF7F1; Ação Necessária = header #C0392B / corpo #FCEEEC. NÃO usar borda lateral com texto colorido.
- Ranking de VOLUME muda pouco (recorde 584k mar/23). FATURAMENTO atualiza com o mês novo (mai/26 = #1, R$68,1Mi). Sem Chart.js (duas tabelas-ranking).
- Template: `references/template_slide18.html`.
