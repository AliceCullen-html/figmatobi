# Templates HTML — Slides Cattalini

Os arquivos `template_slide01.html` e `template_slide02.html` são os HTMLs completos
dos slides com marcadores `%%DADO%%` no lugar dos valores variáveis.

**Como usar todo mês:**
1. Ler o JSON com Python e calcular todos os valores
2. Abrir o template correspondente
3. Substituir os `%%MARCADORES%%` pelos valores calculados
4. Salvar como `slide_NN_nome.html` em `/mnt/user-data/outputs/`

---

## Marcadores — Slide 01 (Destaques)

| Marcador | Descrição | Exemplo |
|----------|-----------|---------|
| `%%MES_ANO%%` | Mês e ano por extenso | `Abril 2026` |
| `%%MES_ANO_CURTO%%` | Mês/ano curto | `abr/26` |
| `%%MES_ANO_ANT%%` | Mês anterior (YoY) | `abr/25` |
| `%%ANO%%` | Ano atual | `2026` |
| `%%ANO_ANT%%` | Ano anterior | `2025` |
| `%%MES%%` | Mês por extenso | `abril` |
| `%%FAT_REAL%%` | Fat. Realizado em Mi | `59,5` |
| `%%FAT_ORC%%` | Fat. Orçado em Mi | `58,1` |
| `%%FAT_VAR_ORC%%` | Var % vs orçado | `2,3` |
| `%%FAT_SINAL%%` | ▲ ou ▼ | `▲` |
| `%%FAT_VAR_AA%%` | Var % vs ano anterior | `0,6` |
| `%%FAT_SINAL_AA%%` | ▲ ou ▼ | `▼` |
| `%%FAT_REAL_ANT%%` | Fat. Real mês anterior | `59,9` |
| `%%FAT_YTD%%` | Fat. YTD acumulado Mi | `238,2` |
| `%%FAT_YTD_VAR_ORC%%` | Var % YTD vs orçado | `2,0` |
| `%%FAT_YTD_VAR_AA%%` | Var % YTD vs ano ant. | `1,3` |
| `%%FAT_YTD_SINAL%%` | ▲ ou ▼ | `▲` |
| `%%FAT_YTD_SINAL_AA%%` | ▲ ou ▼ | `▲` |
| `%%FAT_2022%%` | Fat. 2022 anual Mi | `415` |
| `%%FAT_ANO_ANT%%` | Fat. ano anterior anual Mi | `690` |
| `%%FAT_CRESC_3A%%` | Crescimento 3 anos % | `66` |
| `%%MOV_TOTAL%%` | Mov. total mercado k | `873` |
| `%%MOV_SINAL%%` | ▲ ou ▼ | `▲` |
| `%%MOV_VAR_AA%%` | Var % mov vs ano ant. | `0,3` |
| `%%MESES_N%%` | Nº meses YTD | `4` |
| `%%MESES_YTD%%` | Período YTD | `jan–abr` |
| `%%MESES_CONS%%` | Meses consecutivos acima | `4` |
| `%%SHARE_CAT%%` | Share Cattalini % | `54,0` |
| `%%SHARE_CAT_YTD%%` | Share Cat. YTD % | `58,3` |
| `%%SHARE_CAT_YTD_ANT%%` | Share Cat. YTD ano ant. % | `53,3` |
| `%%SHARE_CAT_MED%%` | Share Cat. média ano ant. % | `49` |
| `%%SHARE_CAT_DIFF%%` | Diferença p.p. | `5,0` |
| `%%SHARE_SINAL%%` | ▲ ou ▼ | `▲` |
| `%%SHARE_TRANS%%` | Share Transpetro % | `31,2` |
| `%%SHARE_TRANS_YTD%%` | Share Transpetro YTD % | `28,4` |
| `%%SHARE_CBL%%` | Share CBL % | `12,1` |
| `%%SHARE_TERIN%%` | Share Terin % | `2,8` |
| `%%SHARE_CAT_TRANS%%` | Cat + Transpetro soma % | `85` |
| `%%MES_PICO%%` | Mês pico share | `fev` |
| `%%SHARE_PICO%%` | Share no pico % | `63` |
| `%%MES_ANT%%` | Mês anterior | `mar` |
| `%%SHARE_ANT%%` | Share mês anterior % | `58` |

---

## Marcadores — Slide 02 (Faturamento)

| Marcador | Descrição | Exemplo |
|----------|-----------|---------|
| `%%MES_ANO%%` | Mês e ano | `Abril 2026` |
| `%%MES_ANO_ANT%%` | Mês ano anterior | `abr/2025` |
| `%%FAT_REAL%%` | Fat. Real Mi | `59,5` |
| `%%FAT_ORC%%` | Fat. Orçado Mi | `58,1` |
| `%%FAT_VAR_ORC%%` | Var % vs orçado | `2,3` |
| `%%FAT_SINAL_AA%%` | ▲ ou ▼ | `▼` |
| `%%FAT_VAR_AA%%` | Var % vs ano ant. | `0,6` |
| `%%ATING%%` | % Atingimento | `102,3` |
| `%%MESES_CONS%%` | Meses consecutivos | `4` |
| `%%MOV_CAT%%` | Mov. Cattalini k | `471` |
| `%%MOV_SINAL_AA%%` | ▲ ou ▼ | `▼` |
| `%%MOV_VAR_AA%%` | Var % mov aa | `2,4` |
| `%%GRUPOS_ACIMA%%` | Nº grupos acima aa | `4` |
| `%%GRUPOS_ACIMA_NOMES%%` | Nomes dos grupos | `Óleo Veg · Aquec · Soda · Outros` |
| `%%GRUPO_DESTAQUE%%` | Grupo destaque positivo | `Óleo Vegetal` |
| `%%GRUPO_DESTAQUE_VAR%%` | Var % destaque aa | `81,9` |
| `%%GRUPO_DETRATOR%%` | Grupo detrator | `Metanol` |
| `%%GRUPO_DETRATOR_VAR%%` | Var % detrator aa | `19,8` |
| `%%SUBHL%%` | Subtítulo dinâmico | texto analítico |
| **Por grupo (prefixo D=Derivados, M=Metanol, A=Aquecidos, OV=Óleo Vegetal, S=Soda, B=Biocomb., O=Outros, TOT=Total):** | | |
| `%%X_FAT_R%%` | Fat. Real do grupo | `R$18,2Mi` |
| `%%X_FAT_O%%` | Fat. Orçado do grupo | `R$15,9Mi` |
| `%%X_VAR_F%%` | Variação R$ fat. | `+R$2,29Mi` |
| `%%X_VAR_F_CLS%%` | Classe CSS (up/down) | `up` |
| `%%X_TON_R%%` | TON Real do grupo | `184,5k` |
| `%%X_TON_O%%` | TON Orçado do grupo | `148,7k` |
| `%%X_VAR_M%%` | Variação TON | `+35,8k` |
| `%%X_VAR_M_CLS%%` | Classe CSS (up/down) | `up` |
| `%%CALLOUT_POS_1/2/3%%` | Textos callout positivo | texto analítico |
| `%%CALLOUT_NEG_1/2%%` | Textos callout negativo | texto analítico |
| `%%CALLOUT_WARN_1%%` | Texto callout atenção | texto analítico |

---

## Snippet Python — Substituição automática

```python
import json

def pct_fmt(v): return f"{abs(v):.1f}".replace('.', ',')
def mi_fmt(v):  return f"R${v/1e6:.1f}Mi".replace('.', ',')
def k_fmt(v):   return f"{v/1e3:.1f}k".replace('.', ',')
def sinal(v):   return "▲" if v >= 0 else "▼"
def cls(v):     return "up" if v >= 0 else "down"
def var_mi(v):  return f"{'+' if v>=0 else '−'}R${abs(v)/1e6:.2f}Mi".replace('.', ',')
def var_k(v):   return f"{'+' if v>=0 else '−'}{abs(v/1e3):.1f}k".replace('.', ',')

with open('references/template_slide02.html') as f:
    html = f.read()

replacements = {
    '%%MES_ANO%%':     'Maio 2026',
    '%%FAT_REAL%%':    '61,2',
    '%%FAT_ORC%%':     '70,2',
    # ... todos os marcadores
}

for marker, value in replacements.items():
    html = html.replace(marker, str(value))

with open('/mnt/user-data/outputs/slide_02_faturamento.html', 'w') as f:
    f.write(html)
```
