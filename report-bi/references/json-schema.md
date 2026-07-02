# JSON Schema — Export Power BI Cattalini

## Estrutura raiz

```
results[0].tables[0].rows[]
```

Filtrar apenas rows com `"dCalendario[ANO]"` presente (ignorar linha `{"[Mov Orcada]": 0.0}`).

## Campos de dimensão temporal

| Campo | Tipo | Exemplo |
|-------|------|---------|
| `dCalendario[ANO]` | string | `"2026"` |
| `dCalendario[MêsNum]` | int | `4` |
| `dCalendario[Mês]` | string | `"abril"` |

## Campos de faturamento

| Campo | Unidade | Observação |
|-------|---------|------------|
| `[Fat Realizado]` | R$ | Ausente em meses futuros |
| `[Fat Orcado]` | R$ | Presente em todos os meses |

## Campos de movimentação por terminal

| Campo | Unidade | Terminais |
|-------|---------|-----------|
| `[Mov Cattalini]` | ton/m³ | Principal terminal |
| `[Mov CBL]` | ton/m³ | — |
| `[Mov Terin]` | ton/m³ | Pode ser 0 |
| `[Mov Transpetro]` | ton/m³ | — |
| `[Mov Vopak]` | ton/m³ | Zero a partir de 2025 |
| `[Mov Alcool]` | ton/m³ | Zero a partir de 2025 |
| `[Mov Liquipar]` | ton/m³ | Aparece apenas em 2026 |
| `[Mov Orcada]` | ton/m³ | Movimentação orçada (só Cattalini ou total — verificar) |

## Campos de market share

| Campo | Tipo | Conversão |
|-------|------|-----------|
| `[Share Cattalini]` | float 0–1 | × 100 para % |
| `[Share CBL]` | float 0–1 | × 100 para % |
| `[Share Terin]` | float 0–1 | × 100 para % |
| `[Share Transpetro]` | float 0–1 | × 100 para % |
| `[Share Vopak]` | float 0–1 | × 100 para % |
| `[Share Alcool]` | float 0–1 | × 100 para % |

## Padrões de filtragem

```python
terminais = ['Cattalini','CBL','Terin','Transpetro','Vopak','Alcool','Liquipar']

# Meses com dado real
reais = [r for r in rows if "[Fat Realizado]" in r]

# Meses futuros (só orçado)
futuros = [r for r in rows if "[Fat Realizado]" not in r and "[Fat Orcado]" in r]

# Mês específico
mes = next((r for r in rows if r.get("dCalendario[ANO]")==ano and r.get("dCalendario[MêsNum]")==num), None)

# Total mov de um mês
mov_total = sum(r.get(f"[Mov {t}]", 0) for t in terminais)

# % atingimento
pct = (fat_real - fat_orc) / fat_orc * 100

# YoY
yoy = (val_atual - val_anterior) / val_anterior * 100
```

## Observações importantes

- `[Mov Orcada]` parece representar apenas parte da movimentação (não bate com soma dos terminais) — usar como referência orçada da Cattalini ou do mercado, mas não somar com movimentação por terminal
- Vopak e Alcool zerados a partir de 2025
- Liquipar aparece a partir de jan/2026
- Primeiro row do JSON pode ser `{"[Mov Orcada]": 0.0}` sem data — ignorar
- Shares somam ~1.0 por mês nos meses reais (verificar antes de exibir)

---

## JSON de Produtos (resumo-bi-produtos.json)

Estrutura separada com Fat e Mov por grupo de produto (apenas Cattalini).

```
results[0].tables[0].rows[]
```

| Campo | Tipo | Exemplo |
|-------|------|---------|
| `dCalendario[ANO]` | string | `"2026"` |
| `dCalendario[MêsNum]` | int | `4` |
| `dCalendario[Mês]` | string | `"abril"` |
| `Realizado_Faturamento[GRUPO DE PRODUTOS]` | string | `"Metanol"` |
| `[Fat Realizado]` | R$ | faturamento do grupo |
| `[Mov Realizada]` | TON | movimentação do grupo |

**Grupos disponíveis:** Metanol, Derivados, Aquecidos, Óleo Vegetal, Soda Cáustica, Biocombustíveis, Outros, Acostagem

**Obs:** Movimentação aqui = apenas Cattalini. Total de mercado usar JSON de terminais.

```python
# Filtro padrão por mês
abr26_p = [r for r in rowsp if r.get("dCalendario[ANO]")=="2026" and r.get("dCalendario[MêsNum]")==4]

# ABC por faturamento
fat_total = sum(r['[Fat Realizado]'] for r in abr26_p)
sorted_g = sorted(abr26_p, key=lambda r: r['[Fat Realizado]'], reverse=True)
cum, abc = 0, {}
for r in sorted_g:
    g = r['Realizado_Faturamento[GRUPO DE PRODUTOS]']
    cum += r['[Fat Realizado]'] / fat_total * 100
    abc[g] = 'A' if cum <= 70 else ('B' if cum <= 90 else 'C')
```

---

## JSONs de CLIENTE (novos — desde mai/2026)

| Arquivo | Grão | Campos | Uso |
|---------|------|--------|-----|
| `resumo-bi-clientes-fat.json` | **ANO** (sem mês) | `Realizado_Faturamento[Grupo de Cliente ]`, `[Fat_Realizado]`, `[Fat_Orcado]` | Fat por cliente YTD (slides 03/06) |
| `resumo-bi-clientes-mov.json` | **ANO** (sem mês) | `Mov - Realizada(Cliente)[Grupo]`, `[GRUPO2]` (grupo produto), `[Mov_Realizada_TON]` | Mov por cliente YTD (slide 04) |
| `resumo-bi-clientes-produto.json` | ANO×Mês×Cliente×Produto | só `[Fat_Orcado]` | **inútil** (só orçado quebrado) |

Todos com **BOM** → ler com `encoding='utf-8-sig'`.

## ⚠️ CONSTRAINTS DE DADOS (verificado mai/2026 — SEMPRE conferir)

1. **`[Fat_Orcado]` por CLIENTE está QUEBRADO** — repete o total geral em toda linha
   (bug SUMMARIZECOLUMNS). NÃO usar var-vs-orçado por cliente nem taxa de retenção
   vs orçado a partir do JSON. Só do print.
2. **`[Fat Orcado]` por PRODUTO também está quebrado** (repete o total mensal em todo
   grupo) — em abril E maio. "Realizado vs Orçado por grupo" (slide 02) **precisa de print**.
   O **YoY por produto** (`[Fat Realizado]` mes atual vs mesmo mes ano-1) sai LIMPO.
3. **`[Mov Realizada]` por PRODUTO** vem quebrada (repete total) ou ausente (maio=0).
   Volume por grupo do slide 02 **precisa de print**. `[TON Faturado]`/`[M3 Faturado]`
   por grupo SÃO limpos (alimentam slide 08).
4. **Clientes só vêm em grão ANUAL/YTD** — não há cliente×mês utilizável.
   → Slide 04 (Carteira Mov, YTD) encaixa. Slide 03 (Carteira Fat) era mensal:
   converter para YTD OU pedir print se quiser mensal/var-orçado.
5. **`[Share X]` (terminais) pode faltar no mês corrente** — em mai/2026 só jan–abr
   tinham share no export; maio veio sem. Pedir print da aba MARKETSHARE
   (filtrar Mês = mês alvo p/ mensal; Mês = Todos p/ YTD).
6. **`resumo-bi-ytd.json`** pode estar defasado (mov YTD não bate com mês corrente).
   Recalcular YTD somando os meses de `resumo-bi.json`/`resumo-bi-produtos.json`.

## Padrão de leitura robusto
```python
import json
def load(f):
    return json.load(open(f, encoding='utf-8-sig'))['results'][0]['tables'][0]['rows']
```

## ⚠️ ARMADILHA CRÍTICA — clientes-fat: anos com grão diferente
`resumo-bi-clientes-fat.json` (e `clientes-mov`) trazem **2026 = YTD (jan→mês corrente)**
mas **2025 = ANO INTEIRO (jan–dez, ~690Mi)**. Logo:
- YoY por cliente = **INVÁLIDO** (5 meses 2026 vs 12 meses 2025 → todo cliente aparece −50/60%)
- Novos/Perdidos/Retenção por cliente = **INVÁLIDO** (cliente do ano inteiro 2025
  ausente no YTD 2026 vira "perdido" falso)
**Utilizável do JSON:** só Top N por fat YTD 2026 (realizado), %participação e ABC.
**Slides 03 e 06 com variação aa / retenção / churn → EXIGEM PRINT** da aba de carteira
(CLIENTES x FAT) do BI, que faz a comparação de período correta + orçado por cliente.

## Aba CURVA ABC (print) — fonte canônica do slide 05/06
O print da aba **CURVA ABC** (view "Fat x Produto") traz, numa só tela:
- **Tabela por produto** com FAT REAL, **FAT ORÇADO e VAR ORÇ reais por produto** (resolve a limitação do JSON, onde Fat_Orcado por grupo vem quebrado/repetido).
- **Faixa de 6 cards**: 3 de PRODUTO (A/B/C) + 3 de CLIENTE (A/B/C) com R$, % e contagem. Classificação cliente: A>R$2,5Mi · B>R$0,8Mi · C demais.
- **Side-panel "Faturamento por Cliente"** (mês vs ano anterior) com badge ABC — alimenta o slide 06.
- Pode aparecer produto **"Acostagem"** (Cls C, ~R$0) — contabiliza na contagem de produtos C mas é ~zero no gráfico.
Conclusão: slide 05 **NÃO é só JSON** — sempre pedir o print da aba CURVA ABC (Fat x Produto). O JSON serve de conferência do Var AA.

## Donut do slide 05/06 — cores FIXAS por grupo de produto
Cada grupo tem cor fixa na rosca, independente da ordem/rank:
Metanol #00B050 · Derivados #14204A · Aquecidos #8A9BB0 · Óleo Vegetal #F5C400 · Soda Cáustica #C8D4DF · Outros #5A82B5 · Biocombustíveis #F0A33A.
**Acostagem** (~R$0) é removida do pareto/donut e NÃO conta no nº de produtos do card (Classe C = 3 produtos, não 4).

## Slide 06 (Curva ABC Cliente) — base MENSAL
Slide 06 é MENSAL (igual 02–05): maio, base 1 mês, A>R$2,5Mi, B>R$0,8Mi.
A aba FAT X CLIENTE costuma abrir em YTD (base 5 mês, A>R$12,5Mi) — NÃO usar direto: as faixas mudam (ex.: faixa A YTD=6 clientes vs mensal=8; VIBRA e FS são A no mês e B no YTD).
Pedir a lista FAT X CLIENTE filtrada em MÊS=maio (base 1 mês). Se só houver YTD, a faixa A vem do side-panel mensal do Fat x Produto e B/C aproximadas da lista YTD (tirando os clientes ~R$0 que não moveram no mês).

## Conferência slide 02 (Real x Orçado) x Curva ABC
O FAT REAL/ORÇ/VAR por produto do print da aba CURVA ABC é a fonte mais confiável (valores em R$ inteiros). Conferir o slide 02 contra ele — ex.: em mai/26 Óleo Vegetal era R$8,80Mi (não 8,5), var orçado +R$3,56Mi. Regra: linhas da tabela devem somar o total exibido.


## Market Share Derivados (slide 13)
- SEM Transpetro: normaliza Cattalini × CBL × Terin = 100%. Transpetro é EXCLUÍDO desta visão.
- Dado específico de derivados NÃO está no JSON (que só tem share geral) → ler % das barras do print.
- Cores: Cattalini #10253F, CBL #FFC000, Terin #9BBB59.
