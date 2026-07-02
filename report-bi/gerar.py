#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador do deck Cattalini. Le references/dados_mes.json e monta os slides
mecanicos (14 Soda, 16 Transpetro, 18 Top Meses) prontos em /mnt/user-data/outputs/.
Os demais templates sao copiados como base (revisar dados).
Uso:  python3 gerar.py
"""
import json, os, shutil, re

SKILL = os.path.dirname(os.path.abspath(__file__))
REF   = os.path.join(SKILL, "references")
OUT   = "/mnt/user-data/outputs"
os.makedirs(OUT, exist_ok=True)

with open(os.path.join(REF, "dados_mes.json"), encoding="utf-8") as f:
    D = json.load(f)

META = D["meta"]
NAV  = META["nav_corrente"]

def br(n, dec=1):
    s = f"{n:.{dec}f}".replace(".", ",")
    return s

def kfmt(v):  # 41667 -> "41,7k"
    return br(v/1000, 1) + "k"

def js_list(lst, quote=True):
    if quote:
        return "[" + ",".join("'%s'" % x for x in lst) + "]"
    return "[" + ",".join(str(x) for x in lst) + "]"

# ============================================================ SLIDE 14 — SODA
def gen_soda():
    s = D["slide14_soda"]
    labels, vols = s["labels"], s["volumes"]
    ref = META["ref"]; vol_mai = vols[-1]
    prev_mes, prev_vol = labels[-2], vols[-2]
    direc = "recupera vs" if vol_mai >= prev_vol else "recua vs"
    HTML = SODA_TMPL
    rep = {
        "__JANELA__": META["janela_label"], "__REF__": ref,
        "__CONS__": str(s["meses_consecutivos"]),
        "__VOLMAI__": f"{vol_mai} K TON", "__YTD__": br(s["ytd_k"],1)+"k TON",
        "__MINK__": f"{s['min_k']} K TON", "__MINMES__": s["min_mes"],
        "__MAXK__": f"{s['max_k']} K TON", "__MAXMES__": s["max_mes"],
        "__SECLBL__": META["janela_label"].replace("/2025","/25").replace("/2026","/26"),
        "__DIREC__": f"{vol_mai}k TON em {ref} — {direc} {prev_mes} ({prev_vol}k)",
        "__LABELS__": js_list(labels), "__VOLS__": js_list(vols, False),
        "__NAV__": js_list(NAV),
    }
    for k, v in rep.items():
        HTML = HTML.replace(k, v)
    path = os.path.join(OUT, "slide_14_ms_soda_caustica.html")
    open(path, "w", encoding="utf-8").write(HTML)
    return path, f"vol {ref}={vol_mai}k · YTD {br(s['ytd_k'],1)}k · {s['meses_consecutivos']} meses 100%"

# ====================================================== SLIDE 16 — TRANSPETRO
PRODNAME = {"die":"Diesel","bun":"Bunker","glp":"GLP","gas":"Gasolina","naf":"Nafta"}
def gen_transpetro():
    s = D["slide16_transpetro"]
    labels, data = s["labels"], s["data"]
    ref = META["ref"]; m = data[ref]
    total = sum(m.values())
    pct = lambda v: round(v/total*100)
    # produto lider do mes
    lead = max(("die","bun","glp","gas"), key=lambda k: m[k])
    prev = data[labels[-2]]; prev_tot = sum(prev.values())
    # data block JS
    rows = []
    for l in labels:
        dd = data[l]
        rows.append("  { lbl:'%s', die:%d, bun:%d, glp:%d, gas:%d, naf:%d }"
                    % (l, dd["die"], dd["bun"], dd["glp"], dd["gas"], dd["naf"]))
    data_js = "[\n" + ",\n".join(rows) + ",\n]"
    HTML = TRANSP_TMPL
    rep = {
        "__JANELA__": META["janela_label"], "__REF__": ref,
        "__SECLBL__": META["janela_label"].replace("/2025","/25").replace("/2026","/26"),
        "__LEAD__": PRODNAME[lead], "__LEADV__": kfmt(m[lead])+" m³", "__LEADPCT__": str(pct(m[lead])),
        "__TOTAL__": kfmt(total)+" m³", "__TOTPREV__": kfmt(prev_tot),
        "__DIE__": kfmt(m["die"])+" m³", "__DIEP__": str(pct(m["die"])),
        "__BUN__": kfmt(m["bun"])+" m³", "__BUNP__": str(pct(m["bun"])),
        "__GAS__": kfmt(m["gas"])+" m³", "__GASP__": str(pct(m["gas"])),
        "__GLP__": kfmt(m["glp"])+" m³", "__GLPP__": str(pct(m["glp"])),
        "__NAF__": (kfmt(m["naf"])+" m³") if m["naf"] else "0 m³",
        "__LABELS__": js_list(labels), "__NAV__": js_list(NAV),
        "__DATA__": data_js, "__YMAX__": str(s["y_max"]),
    }
    for k, v in rep.items():
        HTML = HTML.replace(k, v)
    path = os.path.join(OUT, "slide_16_transpetro_mov.html")
    open(path, "w", encoding="utf-8").write(HTML)
    return path, f"{ref}: lider {PRODNAME[lead]} {kfmt(m[lead])} ({pct(m[lead])}%) · total {kfmt(total)} m³"

# ====================================================== SLIDE 18 — TOP MESES
def _rows(lst):
    medal = ["🥇","🥈","🥉"]
    out = []
    for i, (mes, val) in enumerate(lst):
        if i < 3:
            rk = f'<span class="medal">{medal[i]}</span>'; mc = "mes b"
        else:
            rk = f'<span class="rnum">#{i+1}</span>'; mc = "mes"
        out.append(f'<tr><td class="rk">{rk}</td><td class="{mc}">{mes}</td><td class="val">{val}</td></tr>')
    return "\n          ".join(out)

def gen_top_meses():
    s = D["slide18_top_meses"]
    fat1_mes = s["faturamento"][0][0]; fat1_val = s["faturamento"][0][1]
    pct_2o = br((s["fat_top1_mi"]/s["fat_top2_mi"]-1)*100, 1)
    mov_ref_k = D["kpis_gerais"]["mov_real_ton"]/1000
    gap = round((s["recorde_vol_k"]/mov_ref_k - 1)*100)
    HTML = TOP_TMPL
    rep = {
        "__FAT1MES__": fat1_mes, "__FAT1VAL__": fat1_val, "__PCT2O__": pct_2o,
        "__RECVOL__": str(s["recorde_vol_k"]), "__RECMES__": s["recorde_vol_mes"],
        "__GAP__": str(gap), "__REFVOL__": f"{round(mov_ref_k)}k", "__REF__": META["ref"],
        "__ROWS_VOL__": _rows(s["volume"]), "__ROWS_FAT__": _rows(s["faturamento"]),
        "__PG__": str(s["pagina"]),
    }
    for k, v in rep.items():
        HTML = HTML.replace(k, v)
    path = os.path.join(OUT, "slide_18_top_meses.html")
    open(path, "w", encoding="utf-8").write(HTML)
    return path, f"#1 fat {fat1_mes}={fat1_val} (+{pct_2o}% vs 2o) · recorde vol {s['recorde_vol_k']}k intacto"

# ======================================================= TEMPLATES (estilo canonico)
SODA_TMPL = r"""<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#fff;width:1440px}
.slide{width:1440px;height:829px;background:#fff;padding:40px 64px 32px;display:flex;flex-direction:column;overflow:hidden}
.slide-tag{font-size:10px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:#8B92A9;margin-bottom:3px}
.slide-title{font-size:21px;font-weight:300;color:#14204A;letter-spacing:-.3px;margin-bottom:6px}
.gold-rule{height:2px;background:#F5C400;margin-bottom:14px}
.headline{margin-bottom:12px}
.hl-main{font-size:15px;font-weight:400;color:#14204A;line-height:1.4;margin-bottom:3px}
.hl-up{color:#0A8F5C;font-weight:600}.hl-sub{font-size:11px;color:#8B92A9}
.kpi-row{display:flex;gap:0;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #F0F2F8}
.kpi{flex:1;padding-right:22px;border-right:1px solid #E8EAF2;margin-right:22px}
.kpi:last-child{border-right:none;margin-right:0;padding-right:0}
.kpi-bar{height:3px;border-radius:2px;margin-bottom:6px}
.kpi-lbl{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#8B92A9;margin-bottom:3px}
.kpi-val{font-size:26px;font-weight:400;line-height:1;letter-spacing:-.3px;margin-bottom:2px}
.kpi-sub{font-size:10px;color:#8B92A9}
.body{display:grid;grid-template-columns:1fr 240px;gap:36px;flex:1;min-height:0}
.chart-col{display:flex;flex-direction:column;min-height:0}
.sec-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8B92A9;padding-bottom:6px;border-bottom:1px solid #F0F2F8;margin-bottom:8px}
.chart-wrap{flex:1;position:relative;min-height:0}
.legend-row{display:flex;gap:16px;margin-top:10px;align-items:center}
.leg{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600}
.leg-sq{width:12px;height:12px;border-radius:3px;flex-shrink:0}
.right{display:flex;flex-direction:column;gap:16px;padding-top:2px}
.callout-tag{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#F5C400;background:#14204A;padding:3px 10px;display:inline-block;margin-bottom:8px;border-radius:2px}
.c-items{display:flex;flex-direction:column;gap:8px}.c-item{display:flex;gap:8px;align-items:flex-start}
.arr{font-size:13px;flex-shrink:0;line-height:1.45}.arr-up{color:#0A8F5C}.arr-down{color:#C93030}.arr-warn{color:#D08000}
.c-text{font-size:11px;color:#2A3060;line-height:1.6}.c-text strong{font-weight:600;color:#14204A}
.rule{height:1px;background:#F0F2F8}
</style></head><body><div class="slide">
<div class="slide-tag">Market Share · Soda Cáustica · Paranaguá · %/t</div>
<div class="slide-title">Market Share — Soda Cáustica</div>
<div class="gold-rule"></div>
<div class="headline">
  <div class="hl-main">Cattalini detém <span class="hl-up">100% do mercado</span> de Soda Cáustica em Paranaguá — posição de monopólio mantida em <span class="hl-up">todos os __CONS__ meses</span> consecutivos</div>
  <div class="hl-sub">__JANELA__ · Market share e volume por mês · Soda Cáustica · Paranaguá (%/t)</div>
</div>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-bar" style="background:#10253F"></div><div class="kpi-lbl">Market Share — __REF__</div><div class="kpi-val" style="color:#0A8F5C;font-weight:700;">100%</div><div class="kpi-sub">Monopólio absoluto Paranaguá</div></div>
  <div class="kpi"><div class="kpi-bar" style="background:#10253F;opacity:.4"></div><div class="kpi-lbl">Volume — __REF__</div><div class="kpi-val" style="color:#14204A;">__VOLMAI__</div><div class="kpi-sub">100% Cattalini</div></div>
  <div class="kpi"><div class="kpi-bar" style="background:#F5C400"></div><div class="kpi-lbl">YTD Jan–__REF__</div><div class="kpi-val" style="color:#14204A;">__YTD__</div><div class="kpi-sub">Acumulado 2026</div></div>
  <div class="kpi"><div class="kpi-bar" style="background:#10253F;opacity:.3"></div><div class="kpi-lbl">Mínima do período</div><div class="kpi-val" style="color:#D08000;">__MINK__</div><div class="kpi-sub">__MINMES__ — ainda 100% share</div></div>
  <div class="kpi"><div class="kpi-bar" style="background:#10253F;opacity:.3"></div><div class="kpi-lbl">Máxima do período</div><div class="kpi-val" style="color:#14204A;">__MAXK__</div><div class="kpi-sub">__MAXMES__</div></div>
  <div class="kpi"><div class="kpi-bar" style="background:#0A8F5C"></div><div class="kpi-lbl">Meses consecutivos 100%</div><div class="kpi-val" style="color:#0A8F5C;font-weight:600;">__CONS__</div><div class="kpi-sub">__SECLBL__</div></div>
</div>
<div class="body">
  <div class="chart-col">
    <div class="sec-label">Market Share Soda Cáustica — Cattalini (%/t) · __SECLBL__ · Volume por mês (K TON)</div>
    <div class="chart-wrap"><canvas id="rc"></canvas></div>
    <div class="legend-row"><div class="leg"><span class="leg-sq" style="background:#10253F"></span><span style="color:#10253F;">Cattalini — 100%</span></div><span style="font-size:10px;color:#8B92A9;margin-left:8px;">Nenhum outro terminal opera Soda Cáustica em Paranaguá</span></div>
  </div>
  <div class="right">
    <div><div class="callout-tag">Posição estratégica</div><div class="c-items">
      <div class="c-item"><span class="arr arr-up">↑</span><span class="c-text"><strong>Monopólio absoluto</strong> — Cattalini é o único terminal a operar Soda Cáustica em Paranaguá</span></div>
      <div class="c-item"><span class="arr arr-up">↑</span><span class="c-text"><strong>100% de retenção</strong> de market share — sem risco competitivo imediato</span></div>
      <div class="c-item"><span class="arr arr-up">↑</span><span class="c-text">Alta barreira de entrada — <strong>infraestrutura especializada</strong> como diferencial</span></div>
    </div></div>
    <div class="rule"></div>
    <div><div class="callout-tag">Volume — atenção</div><div class="c-items">
      <div class="c-item"><span class="arr arr-up">↑</span><span class="c-text"><strong>__DIREC__</strong></span></div>
      <div class="c-item"><span class="arr arr-warn">→</span><span class="c-text"><strong>Sazonalidade alta</strong> — varia de __MINK__ (__MINMES__) a __MAXK__ (__MAXMES__). Planejar capacidade</span></div>
      <div class="c-item"><span class="arr arr-warn">→</span><span class="c-text">Apesar do monopólio, o volume segue só a <strong>demanda do produto</strong> — sem upside competitivo</span></div>
    </div></div>
  </div>
</div></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script>
const labels=__LABELS__;const volumes=__VOLS__;const nav2026=__NAV__;
const volLabels={id:'volLbls',afterDatasetsDraw(ch){const ctx=ch.ctx;ch.getDatasetMeta(0).data.forEach((bar,i)=>{ctx.save();ctx.textAlign='center';ctx.fillStyle='#14204A';ctx.font='600 10px Inter';ctx.fillText(volumes[i]+' K',bar.x,bar.y-8);const segH=Math.abs(bar.base-bar.y);ctx.fillStyle='#fff';ctx.font='700 12px Inter';ctx.textBaseline='middle';ctx.fillText('100',bar.x,bar.y+segH/2);ctx.restore();});}};
new Chart(document.getElementById('rc'),{type:'bar',plugins:[volLabels],data:{labels,datasets:[{data:new Array(labels.length).fill(100),backgroundColor:labels.map(l=>nav2026.includes(l)?'#10253F':'#10253F99'),borderRadius:{topLeft:4,topRight:4,bottomLeft:0,bottomRight:0},borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(2,6,23,.96)',titleColor:'#94a3b8',bodyColor:'#fff',padding:10,cornerRadius:10,callbacks:{title:items=>items[0].label,label:item=>' Cattalini: 100% — '+volumes[item.dataIndex]+'K TON'}}},layout:{padding:{top:26,right:8}},scales:{x:{grid:{display:false},border:{display:false},ticks:{color:ctx=>nav2026.includes(ctx.tick.label)?'#14204A':'#8B92A9',font:ctx=>({family:'Inter',size:11,weight:nav2026.includes(ctx.tick.label)?'700':'500'}),maxRotation:0}},y:{min:0,max:110,grid:{color:'rgba(148,163,184,.1)'},border:{display:false},ticks:{color:'#94a3b8',font:{size:10,weight:'600'},callback:v=>v+'%',maxTicksLimit:5}}}}});
</script></body></html>"""

TRANSP_TMPL = r"""<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#fff;width:1440px}
.slide{width:1440px;height:829px;background:#fff;padding:40px 64px 32px;display:flex;flex-direction:column;overflow:hidden}
.slide-tag{font-size:10px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:#8B92A9;margin-bottom:3px}
.slide-title{font-size:21px;font-weight:300;color:#14204A;letter-spacing:-.3px;margin-bottom:6px}
.gold-rule{height:2px;background:#F5C400;margin-bottom:14px}
.headline{margin-bottom:12px}
.hl-main{font-size:15px;font-weight:400;color:#14204A;line-height:1.4;margin-bottom:3px}
.hl-up{color:#0A8F5C;font-weight:600}.hl-down{color:#C93030;font-weight:600}.hl-sub{font-size:11px;color:#8B92A9}
.kpi-row{display:flex;gap:0;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #F0F2F8}
.kpi{flex:1;padding-right:20px;border-right:1px solid #E8EAF2;margin-right:20px}
.kpi:last-child{border-right:none;margin-right:0;padding-right:0}
.kpi-bar{height:3px;border-radius:2px;margin-bottom:6px}
.kpi-lbl{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#8B92A9;margin-bottom:3px}
.kpi-val{font-size:20px;font-weight:300;color:#14204A;line-height:1;letter-spacing:-.3px;margin-bottom:2px}
.kpi-val.up{color:#0A8F5C}.kpi-sub{font-size:10px;color:#8B92A9}
.body{display:grid;grid-template-columns:1fr 240px;gap:36px;flex:1;min-height:0}
.chart-col{display:flex;flex-direction:column;min-height:0}
.sec-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8B92A9;padding-bottom:6px;border-bottom:1px solid #F0F2F8;margin-bottom:8px}
.chart-wrap{flex:1;position:relative;min-height:0}
.legend-row{display:flex;flex-wrap:wrap;gap:5px 18px;margin-top:8px}
.leg{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:500;color:#64748b}
.leg-dot{width:9px;height:9px;border-radius:2px;flex-shrink:0}
.right{display:flex;flex-direction:column;gap:16px;padding-top:2px}
.callout-tag{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#F5C400;background:#14204A;padding:3px 10px;display:inline-block;margin-bottom:8px;border-radius:2px}
.c-items{display:flex;flex-direction:column;gap:8px}.c-item{display:flex;gap:8px;align-items:flex-start}
.arr{font-size:13px;flex-shrink:0;line-height:1.45}.arr-up{color:#0A8F5C}.arr-down{color:#C93030}.arr-warn{color:#D08000}
.c-text{font-size:11px;color:#2A3060;line-height:1.6}.c-text strong{font-weight:600;color:#14204A}
.rule{height:1px;background:#F0F2F8}
</style></head><body><div class="slide">
<div class="slide-tag">Movimentação Transpetro · Terminal Cattalini · Paranaguá · m³</div>
<div class="slide-title">Movimentação Transpetro</div>
<div class="gold-rule"></div>
<div class="headline">
  <div class="hl-main"><span class="hl-up">__LEAD__ lidera com __LEADV__</span> (__LEADPCT__%) em __REF__ · Total __REF__: <span class="hl-up">__TOTAL__</span></div>
  <div class="hl-sub">__JANELA__ · Movimentação Transpetro no Terminal Cattalini (m³) · por produto</div>
</div>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-bar" style="background:#14204A"></div><div class="kpi-lbl">Total — __REF__</div><div class="kpi-val up">__TOTAL__</div><div class="kpi-sub">total do mês</div></div>
  <div class="kpi"><div class="kpi-bar" style="background:#14204A"></div><div class="kpi-lbl">Diesel — __REF__</div><div class="kpi-val">__DIE__</div><div class="kpi-sub">__DIEP__% do mês</div></div>
  <div class="kpi"><div class="kpi-bar" style="background:#F5C400"></div><div class="kpi-lbl">Bunker — __REF__</div><div class="kpi-val">__BUN__</div><div class="kpi-sub">__BUNP__% do mês</div></div>
  <div class="kpi"><div class="kpi-bar" style="background:#8A9BB0"></div><div class="kpi-lbl">Gasolina — __REF__</div><div class="kpi-val">__GAS__</div><div class="kpi-sub">__GASP__% do mês</div></div>
  <div class="kpi"><div class="kpi-bar" style="background:#6C809A"></div><div class="kpi-lbl">GLP — __REF__</div><div class="kpi-val">__GLP__</div><div class="kpi-sub">__GLPP__% do mês</div></div>
  <div class="kpi"><div class="kpi-bar" style="background:#D6DEE8"></div><div class="kpi-lbl">Nafta — __REF__</div><div class="kpi-val" style="color:#8B92A9;">__NAF__</div><div class="kpi-sub">no mês</div></div>
</div>
<div class="body">
  <div class="chart-col">
    <div class="sec-label">Movimentação Transpetro por Produto (m³) · __SECLBL__</div>
    <div class="chart-wrap"><canvas id="rc"></canvas></div>
    <div class="legend-row">
      <div class="leg"><span class="leg-dot" style="background:#14204A"></span>Diesel</div>
      <div class="leg"><span class="leg-dot" style="background:#F5C400"></span>Bunker</div>
      <div class="leg"><span class="leg-dot" style="background:#6C809A"></span>GLP</div>
      <div class="leg"><span class="leg-dot" style="background:#8A9BB0"></span>Gasolina</div>
      <div class="leg"><span class="leg-dot" style="background:#D6DEE8;border:1px solid #bbb;"></span>Nafta</div>
    </div>
  </div>
  <div class="right">
    <div><div class="callout-tag">Composição — __REF__</div><div class="c-items">
      <div class="c-item"><span class="arr arr-up">↑</span><span class="c-text"><strong>__LEAD__ __LEADV__</strong> — maior produto do mês (__LEADPCT__%)</span></div>
      <div class="c-item"><span class="arr arr-warn">→</span><span class="c-text">Diesel __DIE__ · Bunker __BUN__ · Gasolina __GAS__ · GLP __GLP__ no mês</span></div>
      <div class="c-item"><span class="arr arr-warn">→</span><span class="c-text">Nafta = __NAF__ — produto intermitente na operação Transpetro</span></div>
    </div></div>
    <div class="rule"></div>
    <div><div class="callout-tag">Tendência do período</div><div class="c-items">
      <div class="c-item"><span class="arr arr-warn">→</span><span class="c-text">Total __REF__ = <strong>__TOTAL__</strong> · mês anterior __TOTPREV__ m³</span></div>
      <div class="c-item"><span class="arr arr-warn">→</span><span class="c-text">Volatilidade alta entre meses — acompanhar Diesel (cabotagem) e Bunker</span></div>
    </div></div>
  </div>
</div></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script>
const labels=__LABELS__;const nav2026=__NAV__;
const data=__DATA__;
const totals=data.map(d=>d.die+d.bun+d.glp+d.gas+d.naf);
const SRVS=[{key:'die',label:'Diesel',color:'#14204A',tc:'#fff'},{key:'bun',label:'Bunker',color:'#F5C400',tc:'#7a5500'},{key:'glp',label:'GLP',color:'#6C809A',tc:'#fff'},{key:'gas',label:'Gasolina',color:'#8A9BB0',tc:'#fff'},{key:'naf',label:'Nafta',color:'#D6DEE8',tc:'#64748b'}];
const totalLabels={id:'totLbl',afterDatasetsDraw(ch){const ctx=ch.ctx;data.forEach((d,i)=>{const metas=ch.data.datasets.map((_,di)=>ch.getDatasetMeta(di));let topY=9999,cx=0;metas.forEach(m=>{if(m.data[i]&&m.data[i].y<topY){topY=m.data[i].y;cx=m.data[i].x;}});ctx.save();ctx.textAlign='center';ctx.fillStyle='#14204A';ctx.font='600 9.5px Inter';ctx.fillText((totals[i]/1000).toFixed(0)+'k',cx,topY-6);ctx.restore();});SRVS.forEach((s,si)=>{const meta=ch.getDatasetMeta(si);meta.data.forEach((bar,i)=>{const v=data[i][s.key];if(!v)return;const segH=Math.abs(bar.base-bar.y);if(segH<16)return;ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=s.tc;ctx.font='500 9px Inter';ctx.fillText((v/1000).toFixed(0)+'k',bar.x,bar.y+segH/2);ctx.restore();});});}};
new Chart(document.getElementById('rc'),{type:'bar',plugins:[totalLabels],data:{labels,datasets:SRVS.map((s,si,arr)=>({label:s.label,data:data.map(d=>d[s.key]),backgroundColor:s.color,borderRadius:si===arr.length-1?{topLeft:4,topRight:4,bottomLeft:0,bottomRight:0}:0,borderSkipped:false,stack:'s'}))},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(2,6,23,.96)',titleColor:'#94a3b8',bodyColor:'#fff',padding:12,cornerRadius:10,callbacks:{title:items=>items[0].label+' — '+Math.round(totals[items[0].dataIndex]/1000)+'k m³ total',label:item=>item.raw?' '+item.dataset.label+': '+(item.raw/1000).toFixed(1)+'k m³':null}}},layout:{padding:{top:22,right:8}},scales:{x:{stacked:true,grid:{display:false},border:{display:false},ticks:{color:ctx=>nav2026.includes(ctx.tick.label)?'#14204A':'#8B92A9',font:ctx=>({family:'Inter',size:11,weight:nav2026.includes(ctx.tick.label)?'700':'500'}),maxRotation:0}},y:{stacked:true,beginAtZero:true,max:__YMAX__,grid:{color:'rgba(148,163,184,.15)'},border:{display:false},ticks:{color:'#94a3b8',font:{size:10,weight:'600'},callback:v=>v?(v/1000).toFixed(0)+'k':'',maxTicksLimit:6}}}}});
</script></body></html>"""

TOP_TMPL = r"""<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#fff;width:1440px}
.slide{width:1440px;height:829px;background:#fff;padding:40px 64px 32px;display:flex;flex-direction:column;overflow:hidden;position:relative}
.slide-label{font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#8B92A9}
.slide-title{font-size:22px;font-weight:700;color:#14204A;letter-spacing:-.3px;margin-top:1px}
.gold-rule{height:3px;background:#F5C400;margin-bottom:1px;margin-top:6px}
.navy-rule{height:1px;background:#14204A;margin-bottom:14px}
.headline{font-size:14px;font-weight:600;color:#14204A;line-height:1.35;margin-bottom:2px}
.headline strong{font-weight:700;color:#14204A}.hl-mute{color:#8B92A9;font-weight:400}
.subhl{font-size:10.5px;color:#8B92A9;margin-bottom:16px}
.body{display:grid;grid-template-columns:1fr 1fr 256px;gap:28px;flex:1;min-height:0}
.tbl-col{display:flex;flex-direction:column;min-height:0}
table{width:100%;border-collapse:collapse}
thead tr{background:#14204A}
th{font-size:8.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#C9B27A;padding:8px 12px;text-align:left}
th.tr{text-align:right}th.tc{text-align:center;width:38px}
tbody tr{border-bottom:1px solid #F0EFEB}
td{padding:8.5px 12px;font-size:12px;font-variant-numeric:tabular-nums}
td.rk{text-align:center;width:38px}
td.mes{font-weight:500;color:#6B7280}td.mes.b{font-weight:700;color:#14204A}
td.val{text-align:right;font-weight:600;color:#14204A;white-space:nowrap}
.medal{font-size:15px;line-height:1}.rnum{color:#8B92A9;font-size:10px;font-weight:600}
.cta{display:flex;flex-direction:column;gap:11px}
.co-box{border-radius:4px;overflow:hidden;border:1px solid #ECEEF4}
.co-hd{padding:5px 11px;font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#fff}
.co-bd{padding:8px 11px}
.hd-alert{background:#22426B}.bd-alert{background:#F5F8FC}
.hd-pos{background:#1E8A5F}.bd-pos{background:#EDF7F1}
.hd-act{background:#C0392B}.bd-act{background:#FCEEEC}
.co-item{display:flex;gap:6px;align-items:flex-start;margin-bottom:6px}.co-item:last-child{margin-bottom:0}
.co-arr{font-size:11px;flex-shrink:0;font-weight:700;line-height:1.45}
.aa-alert{color:#22426B}.aa-pos{color:#1E8A5F}.aa-act{color:#C0392B}
.co-txt{font-size:9.5px;line-height:1.45;color:#3a3a3a}.co-txt strong{color:#14204A;font-weight:600}
.pg{position:absolute;right:64px;bottom:26px;font-size:20px;font-weight:700;color:#14204A}
</style></head><body><div class="slide">
<div><div class="slide-label">ANÁLISE HISTÓRICA · TERMINAL CATTALINI · PARANAGUÁ</div><div class="slide-title">Histórico — Top 10 Meses</div></div>
<div class="gold-rule"></div><div class="navy-rule"></div>
<div class="headline">Recorde de volume em <strong>2022–2023</strong> ainda não superado — <strong>__FAT1MES__</strong> assume o topo do faturamento histórico (__FAT1VAL__) sem entrar no Top 10 de volume <span class="hl-mute">· sinal de evolução de mix e ticket médio</span></div>
<div class="subhl">Base histórica completa · Ranking por volume (TON) e por receita bruta (R$) · Ref. __REF__</div>
<div class="body">
  <div class="tbl-col"><table>
    <thead><tr><th class="tc">#</th><th>Top 10 — Movimentação (TON)</th><th class="tr">Volume</th></tr></thead>
    <tbody>
          __ROWS_VOL__
    </tbody></table></div>
  <div class="tbl-col"><table>
    <thead><tr><th class="tc">#</th><th>Top 10 — Faturamento Histórico (R$)</th><th class="tr">Receita</th></tr></thead>
    <tbody>
          __ROWS_FAT__
    </tbody></table></div>
  <div class="cta">
    <div class="co-box"><div class="co-hd hd-alert">→ Concentração · alerta</div><div class="co-bd bd-alert">
      <div class="co-item"><span class="co-arr aa-alert">→</span><span class="co-txt">Top 10 de volume dominado por <strong>2022–2023</strong> — nenhum mês recente no pódio de TON. Pico de <strong>__RECVOL__k (__RECMES__)</strong> não superado</span></div>
      <div class="co-item"><span class="co-arr aa-alert">→</span><span class="co-txt"><strong>__FAT1MES__ é #1 em faturamento</strong>, mas fora do Top 10 de volume — gap volume × receita no maior nível histórico</span></div>
    </div></div>
    <div class="co-box"><div class="co-hd hd-pos">↑ Destaques positivos</div><div class="co-bd bd-pos">
      <div class="co-item"><span class="co-arr aa-pos">↑</span><span class="co-txt"><strong>__FAT1MES__ = __FAT1VAL__</strong> — novo recorde histórico de faturamento, +__PCT2O__% sobre o 2º melhor mês</span></div>
      <div class="co-item"><span class="co-arr aa-pos">↑</span><span class="co-txt"><strong>Todos os 10 maiores meses de receita</strong> são de 2025/2026 — evolução consistente de ticket e mix</span></div>
      <div class="co-item"><span class="co-arr aa-pos">↑</span><span class="co-txt">Receita <strong>descolada do volume</strong> indica operação mais eficiente por tonelada</span></div>
    </div></div>
    <div class="co-box"><div class="co-hd hd-act">↓ Ação necessária</div><div class="co-bd bd-act">
      <div class="co-item"><span class="co-arr aa-act">↓</span><span class="co-txt">Superar o recorde de <strong>__RECVOL__k TON (__RECMES__)</strong> exige ~+__GAP__% vs __REF__ (__REFVOL__) — expansão de carteira e capacidade</span></div>
      <div class="co-item"><span class="co-arr aa-act">↓</span><span class="co-txt">Defender o faturamento requer <strong>proteger o mix de alto ticket</strong> (Derivados, Aquecidos)</span></div>
    </div></div>
  </div>
</div>
<div class="pg">__PG__</div>
</div></body></html>"""

# ============================================== MOTOR CHART SLIDES (09-13)
ARROW = {"up":("arr-up","↑"),"down":("arr-down","↓"),"warn":("arr-warn","→"),"neu":("arr-neu","→")}

def build_kpis(kpis):
    out=[]
    for k in kpis:
        bar = f'<div class="kpi-bar" style="background:{k["bar"]}"></div>' if k.get("bar") else ""
        vcls = (" "+k["val_cls"]) if k.get("val_cls") else ""
        vsty = f' style="color:{k["val_color"]}"' if k.get("val_color") else ""
        scls = (" "+k["sub_cls"]) if k.get("sub_cls") else ""
        out.append(f'<div class="kpi">{bar}<div class="kpi-lbl">{k["lbl"]}</div>'
                   f'<div class="kpi-val{vcls}"{vsty}>{k["val"]}</div>'
                   f'<div class="kpi-sub{scls}">{k["sub"]}</div></div>')
    return '<div class="kpis">\n    ' + "\n    ".join(out) + '\n  </div>'

def build_sidecol(callouts):
    secs=[]
    for c in callouts:
        tcls = (" "+c["tag_cls"]) if c.get("tag_cls") else ""
        items=[]
        for it in c["items"]:
            acls,ach = ARROW[it["a"]]
            items.append(f'<div class="c-item"><span class="arr {acls}">{ach}</span>'
                         f'<span class="c-text">{it["t"]}</span></div>')
        secs.append(f'<div class="ctag{tcls}">{c["tag"]}</div>\n      '
                    f'<div class="c-items">\n        ' + "\n        ".join(items) + '\n      </div>')
    inner = '\n      <div class="crule"></div>\n      '.join(secs)
    return '<div class="side-col">\n      ' + inner + '\n    </div>'

def build_chart_js(ch):
    eng=ch["engine"]
    if eng=="group_stacked":
        rows=["  { lbl:'%s', isOrc:%s, met:%d, der:%d, aq:%d, ov:%d, sc:%d, out:%d }" %
              (a["lbl"],"true" if a["isOrc"] else "false",a["met"],a["der"],a["aq"],a["ov"],a["sc"],a["out"])
              for a in ch["anos"]]
        return [(r'const anos = \[.*?\];', "const anos = [\n"+",\n".join(rows)+",\n];")]
    if eng=="trio":
        rows=["  { lbl:'%s', kind:'%s', met:%d, der:%d, aq:%d, ov:%d, sc:%d, bio:%d, out:%d }" %
              (b["lbl"],b["kind"],b["met"],b["der"],b["aq"],b["ov"],b["sc"],b["bio"],b["out"])
              for b in ch["bars"]]
        return [(r'const bars = \[.*?\];', "const bars = [\n"+",\n".join(rows)+",\n];")]
    if eng=="share":
        meses = "const meses = [" + ", ".join('"%s"'%m for m in ch["meses"]) + "];"
        totals= "const totals = [" + ",".join(str(t) for t in ch["totals"]) + "];"
        srows=["  { label:'%s', color:'%s', textColor:'%s', data:[%s] }" %
               (s["label"],s["color"],s["textColor"],",".join(str(x) for x in s["data"])) for s in ch["series"]]
        series= "const SERIES = [\n"+",\n".join(srows)+",\n];"
        return [(r'const meses = \[.*?\];',meses),(r'const totals = \[.*?\];',totals),
                (r'const SERIES = \[.*?\];',series)]
    return []

def render_chart_slide(nn, key, fname):
    s = D[key]
    html = open(os.path.join(REF, f"template_slide{nn}.html"), encoding="utf-8").read()
    html = re.sub(r'<div class="headline">.*?</div>',
                  '<div class="headline">\n    '+s["headline"]+'\n  </div>', html, count=1, flags=re.DOTALL)
    html = re.sub(r'<div class="subhl">.*?</div>',
                  '<div class="subhl">'+s["subhl"]+'</div>', html, count=1, flags=re.DOTALL)
    if s.get("chart_lbl"):
        html = re.sub(r'<div class="chart-lbl">.*?</div>',
                      '<div class="chart-lbl">'+s["chart_lbl"]+'</div>', html, count=1, flags=re.DOTALL)
    html = re.sub(r'<div class="kpis">.*?</div>\s*<div class="body-grid">',
                  build_kpis(s["kpis"])+'\n\n  <div class="body-grid">', html, count=1, flags=re.DOTALL)
    html = re.sub(r'<div class="side-col">.*?</div>\s*</div>(\s*<div class="footer">|\s*</div>\s*<script)',
                  lambda m: build_sidecol(s["callouts"])+'\n  </div>'+m.group(1), html, count=1, flags=re.DOTALL)
    for pat, rep in build_chart_js(s["chart"]):
        html = re.sub(pat, rep.replace('\\','\\\\'), html, count=1, flags=re.DOTALL)
    out=os.path.join(OUT, fname); open(out,"w",encoding="utf-8").write(html)
    return out

# ============================================== SLIDE 02 (faturamento)
def _kpis02(kpis):
    out=[]
    for k in kpis:
        vs=f' style="color:{k["vcolor"]}"' if k.get("vcolor") else ""
        d1c=" "+k["d1c"] if k.get("d1c") else ""
        d2c=" "+k["d2c"] if k.get("d2c") else ""
        d2s=f' style="color:{k["d2color"]}"' if k.get("d2color") else ""
        out.append(f'<div class="kpi"><div class="kpi-lbl">{k["lbl"]}</div>'
                   f'<div class="kpi-val big"{vs}>{k["val"]}</div>'
                   f'<div class="kpi-d1{d1c}">{k["d1"]}</div>'
                   f'<div class="kpi-d2{d2c}"{d2s}>{k["d2"]}</div></div>')
    return '<div class="kpis">\n    ' + "\n    ".join(out) + '\n  </div>'

def gen_slide02():
    s=D["slide02_faturamento"]
    html=open(os.path.join(REF,"template_slide02.html"),encoding="utf-8").read()
    html=re.sub(r'<div class="headline">.*?</div>','<div class="headline">\n    '+s["headline"]+'\n  </div>',html,count=1,flags=re.DOTALL)
    html=re.sub(r'<div class="subhl">.*?</div>','<div class="subhl">'+s["subhl"]+'</div>',html,count=1,flags=re.DOTALL)
    html=re.sub(r'<div class="kpis">.*?</div>\s*<div class="body-grid">',_kpis02(s["kpis"])+'\n\n  <div class="body-grid">',html,count=1,flags=re.DOTALL)
    tr=[]
    for r in s["rows"]:
        grp,abc,fr,fo,vf,vfc,to_r,tn_o,vm,vmc=r
        tr.append(f'<tr>\n            <td class="tl">{grp}</td>\n            <td style="text-align:center"><span class="badge {BADGE[abc]}">{abc}</span></td>\n'
                  f'            <td>{fr}</td>\n            <td class="muted">{fo}</td>\n            <td class="{vfc}">{vf}</td>\n'
                  f'            <td>{to_r}</td>\n            <td class="muted">{tn_o}</td>\n            <td class="{vmc}">{vm}</td>\n          </tr>')
    fr,fo,vf,vfc,tn_r,tn_o,vm,vmc=s["total"]
    tot=(f'<tr class="total-row">\n            <td class="tl bold">Total</td>\n            <td style="text-align:center">–</td>\n'
         f'            <td class="bold">{fr}</td>\n            <td class="bold muted">{fo}</td>\n            <td class="bold {vfc}">{vf}</td>\n'
         f'            <td class="bold">{tn_r}</td>\n            <td class="bold muted">{tn_o}</td>\n            <td class="bold {vmc}">{vm}</td>\n          </tr>')
    tbody="<tbody>\n          "+"\n          ".join(tr)+"\n          "+tot+"\n        </tbody>"
    html=re.sub(r'<tbody>.*?</tbody>',tbody,html,count=1,flags=re.DOTALL)
    a="\n          ".join(f'<div class="c-item">\n            <span class="arr arr-up">↑</span>\n            <span class="c-text">{t}</span>\n          </div>' for t in s["ajudou"])
    pp="\n          ".join(f'<div class="c-item">\n            <span class="arr {ARROW[c][0]}">{ARROW[c][1]}</span>\n            <span class="c-text">{t}</span>\n          </div>' for c,t in s["pressionou"])
    sidecol=('<div class="side-col">\n'
             '      <div class="callout-block">\n        <div class="ctag ctag-n">O que ajudou</div>\n        <div class="c-items">\n          '+a+'\n        </div>\n      </div>\n\n'
             '      <div class="crule"></div>\n\n'
             '      <div class="callout-block">\n        <div class="ctag ctag-n">O que pressionou</div>\n        <div class="c-items">\n          '+pp+'\n        </div>\n      </div>\n    </div>')
    html=re.sub(r'<div class="side-col">.*?</div>\s*</div>\s*<div class="footer">',sidecol+'\n  </div>\n\n  <div class="footer">',html,count=1,flags=re.DOTALL)
    for k,v in s["tokens"].items(): html=html.replace(f"%%{k}%%",v)
    out=os.path.join(OUT,"slide_02_faturamento.html"); open(out,"w",encoding="utf-8").write(html); return out

# ============================================== SLIDE 03 (tabela cliente fat)
BADGE = {"A":"ba","B":"bb","C":"bc"}
def gen_slide03():
    s = D["slide03_carteira_fat"]
    html = open(os.path.join(REF,"template_slide03.html"), encoding="utf-8").read()
    html = re.sub(r'<div class="headline">.*?</div>',
                  '<div class="headline">\n    '+s["headline"]+'\n  </div>', html, count=1, flags=re.DOTALL)
    html = re.sub(r'<div class="kpis">.*?</div>\s*<div class="body-grid">',
                  build_kpis(s["kpis"])+'\n\n  <div class="body-grid">', html, count=1, flags=re.DOTALL)
    rows=[]
    for r in s["rows"]:
        rank,name,cls,grp,bw,fat,part,var,vc = r
        rows.append(f'<tr>\n            <td class="rank">{rank}</td><td class="tl">{name}</td>\n'
                    f'            <td style="text-align:center"><span class="badge {BADGE[cls]}">{cls}</span></td><td class="grp">{grp}</td>\n'
                    f'            <td class="bar-wrap"><div class="bar-track"><div class="bar-fill" style="width:{bw}%"></div></div></td>\n'
                    f'            <td class="num">{fat}</td><td class="muted">{part}</td><td class="{vc}">{var}</td>\n          </tr>')
    tot = (f'<tr class="total-row">\n            <td></td><td class="tl bold">Top 10</td><td></td><td></td><td></td>\n'
           f'            <td class="bold">{s["total"][0]}</td><td class="bold">{s["total"][1]}</td><td></td>\n          </tr>')
    tbody = "<tbody>\n          " + "\n          ".join(rows) + "\n          " + tot + "\n        </tbody>"
    html = re.sub(r'<tbody>.*?</tbody>', tbody, html, count=1, flags=re.DOTALL)
    # side-col: 3 blocos ctag + prioridades
    blocks=[]
    for c in s["sidecol"]:
        items="\n          ".join(f'<div class="c-item">\n            <span class="arr {ARROW[it["a"]][0]}">{ARROW[it["a"]][1]}</span>\n            <span class="c-text">{it["t"]}</span>\n          </div>' for it in c["items"])
        blocks.append(f'<div>\n        <div class="ctag {c["cls"]}">{c["tag"]}</div>\n        <div class="c-items">\n          {items}\n        </div>\n      </div>')
    priors="\n          ".join(f'<div class="prior-item">\n            <div class="prior-num">{i+1}</div>\n            <div class="prior-text">{t}</div>\n          </div>' for i,t in enumerate(s["prioridades"]))
    blocks.append(f'<div>\n        <div class="ctag ctag-n">Prioridades de Ação</div>\n        <div class="prior-list">\n          {priors}\n        </div>\n      </div>')
    sidecol='<div class="side-col">\n      ' + '\n\n      <div class="crule"></div>\n\n      '.join(blocks) + '\n    </div>'
    html = re.sub(r'<div class="side-col">.*?</div>\s*</div>\s*<div class="footer">',
                  sidecol+'\n  </div>\n\n  <div class="footer">', html, count=1, flags=re.DOTALL)
    for k,v in s["tokens"].items():
        html = html.replace(f"%%{k}%%", v)
    out=os.path.join(OUT,"slide_03_carteira_fat.html"); open(out,"w",encoding="utf-8").write(html)
    return out

# ============================================== HELPERS (04-08,01)
def build_kpis_ms(kpis):
    out=[]
    for k in kpis:
        vs=""
        if k.get("vcolor"): vs=f' style="color:{k["vcolor"]}"'
        elif k.get("vsize"): vs=f' style="font-size:{k["vsize"]}"'
        vc=" "+k["vcls"] if k.get("vcls") else ""
        subs="".join(f'<div class="kpi-sub{(" "+c) if c else ""}">{t}</div>' for t,c in k["subs"])
        out.append(f'<div class="kpi"><div class="kpi-lbl">{k["lbl"]}</div><div class="kpi-val{vc}"{vs}>{k["val"]}</div>{subs}</div>')
    return '<div class="kpis">\n    '+"\n    ".join(out)+'\n  </div>'

def build_sidecol_prior(sidecol, prioridades):
    blocks=[]
    for c in sidecol:
        items="\n          ".join(f'<div class="c-item">\n            <span class="arr {ARROW[it["a"]][0]}">{ARROW[it["a"]][1]}</span>\n            <span class="c-text">{it["t"]}</span>\n          </div>' for it in c["items"])
        blocks.append(f'<div>\n        <div class="ctag {c["cls"]}">{c["tag"]}</div>\n        <div class="c-items">\n          {items}\n        </div>\n      </div>')
    pr="\n          ".join(f'<div class="prior-item">\n            <div class="prior-num">{i+1}</div>\n            <div class="prior-text">{t}</div>\n          </div>' for i,t in enumerate(prioridades))
    blocks.append(f'<div>\n        <div class="ctag ctag-n">Prioridades de Ação</div>\n        <div class="prior-list">\n          {pr}\n        </div>\n      </div>')
    return '<div class="side-col">\n      ' + '\n\n      <div class="crule"></div>\n\n      '.join(blocks) + '\n    </div>'

def build_cssbars(ch):
    sp,co,am=ch["split"],ch["colors"],ch["axis_max"]
    bars=[]
    for tot in ch["totals"]:
        h=round(tot/am*100,1)
        segs="".join(f'<div class="seg" style="height:{p}%;background:{c}"></div>' for p,c in zip(sp,co))
        bv=f"{tot:,}".replace(",",".")
        bars.append(f'<div class="bcol"><div class="bar" style="height:{h}%"><div class="bval">{bv}</div><div class="segs">{segs}</div></div></div>')
    return "\n        ".join(bars)

def build_abc_cards(cards):
    out=[]
    for i,(cc,dot,lbl,val,sub) in enumerate(cards):
        out.append(f'<div class="abc-card {cc}"><div class="ac-lbl"><span class="ac-dot dot-{dot}"></span><span class="ac-txt txt-{dot}">{lbl}</span></div><div class="ac-val">{val}</div><div class="ac-sub">{sub}</div></div>')
        if i==2: out.append('<div class="sep-v"></div>')
    return '<div class="abc-strip">\n    '+"\n    ".join(out)+'\n  </div>'

def build_segs(segs):
    rows=",\n  ".join("{ label:'%s', pct:%d, color:'%s' }"%(l,p,c) for l,p,c in segs)
    return "const segs = [\n  "+rows+",\n];"

def _donut(html, segs, center):
    html=re.sub(r'const segs = \[.*?\];', build_segs(segs).replace('\\','\\\\'), html, count=1, flags=re.DOTALL)
    html=re.sub(r"(ctx\.fillText\(')[^']*(',cx,cy-9\);)", lambda m:m.group(1)+center[0]+m.group(2), html, count=1)
    html=re.sub(r"(ctx\.fillText\(')[^']*(',cx,cy\+\d+\);)", lambda m:m.group(1)+center[1]+m.group(2), html, count=1)
    return html

# ============================================== SLIDE 04 (tabela mov cliente)
def gen_slide04():
    s=D["slide04_carteira_mov"]
    html=open(os.path.join(REF,"template_slide04.html"),encoding="utf-8").read()
    html=re.sub(r'<div class="headline">.*?</div>','<div class="headline">\n    '+s["headline"]+'\n  </div>',html,count=1,flags=re.DOTALL)
    html=re.sub(r'<div class="subhl">.*?</div>','<div class="subhl">'+s["subhl"]+'</div>',html,count=1,flags=re.DOTALL)
    html=re.sub(r'<div class="kpis">.*?</div>\s*<div class="body-grid">',build_kpis_ms(s["kpis"])+'\n\n  <div class="body-grid">',html,count=1,flags=re.DOTALL)
    rows=[]
    for r in s["rows"]:
        rk,nm,grp,cls,bw,v26,v25,var,vc=r
        rows.append(f'<tr>\n            <td class="rank">{rk}</td>\n            <td class="tl">{nm}</td>\n            <td class="grp">{grp}</td>\n            <td style="text-align:center"><span class="badge {BADGE[cls]}">{cls}</span></td>\n            <td class="bar-wrap"><div class="bar-track"><div class="bar-fill" style="width:{bw}%;background:#14204A"></div></div></td>\n            <td class="num">{v26}</td>\n            <td class="muted">{v25}</td>\n            <td class="{vc}">{var}</td>\n          </tr>')
    html=re.sub(r'<tbody>.*?</tbody>','<tbody>\n          '+"\n          ".join(rows)+'\n        </tbody>',html,count=1,flags=re.DOTALL)
    html=re.sub(r'<div class="side-col">.*?</div>\s*</div>\s*<div class="footer">',build_sidecol_prior(s["sidecol"],s["prioridades"])+'\n  </div>\n\n  <div class="footer">',html,count=1,flags=re.DOTALL)
    for k,v in s["tokens"].items(): html=html.replace(f"%%{k}%%",v)
    o=os.path.join(OUT,"slide_04_carteira_mov.html"); open(o,"w",encoding="utf-8").write(html); return o

# ============================================== SLIDE 05 (ABC produto)
def gen_slide05():
    s=D["slide05_abc_produto"]
    html=open(os.path.join(REF,"template_slide05.html"),encoding="utf-8").read()
    head=f'<div class="headline">\n    <div class="hl-main">\n      {s["headline"]}\n    </div>\n    <div class="hl-sub">{s["hl_sub"]}</div>\n  </div>\n\n  '+build_abc_cards(s["cards"])
    html=re.sub(r'<div class="headline">.*?<div class="abc-strip">.*?</div>\s*<div class="body">',head+'\n\n  <div class="body">',html,count=1,flags=re.DOTALL)
    rows=[]
    for abc,nm,col,w,lbl,acum,orc,aa in s["pareto"]:
        fill=f'<span class="p-fill-lbl">{lbl}</span>' if lbl else ''
        rows.append(f'<div class="p-row">\n          <div class="p-lbl"><span class="abc-b2 b{abc.lower()}">{abc}</span>{nm}</div>\n          <div class="p-outer"><div class="p-fill {col}" style="width:{w}%">{fill}</div></div>\n          <div class="p-acum">{acum}</div><div class="p-orc {orc[1]}">{orc[0]}</div><div class="p-aa {aa[1]}">{aa[0]}</div>\n        </div>')
    html=re.sub(r'<div class="pareto-rows">.*?</div>\s*</div>\s*<div class="right">','<div class="pareto-rows">\n        '+"\n        ".join(rows)+'\n      </div>\n    </div>\n\n    <div class="right">',html,count=1,flags=re.DOTALL)
    co=[]
    for c in s["callouts"]:
        items="".join(f'<div class="c-item"><span class="arr {ARROW[it["a"]][0]}">{ARROW[it["a"]][1]}</span><span class="c-text">{it["t"]}</span></div>' for it in c["items"])
        co.append(f'<div>\n        <div class="callout-tag">{c["tag"]}</div>\n        <div class="c-items">{items}</div>\n      </div>')
    right='<div class="right">\n      '+'\n      <div class="rule"></div>\n      '.join(co)+'\n    </div>'
    html=re.sub(r'<div class="right">.*?</div>\s*</div>\s*</div>\s*<script',right+'\n  </div>\n</div>\n\n<script',html,count=1,flags=re.DOTALL)
    html=_donut(html,s["segs"],s["donut_center"])
    html=re.sub(r'<div class="donut-title">.*?</div>','<div class="donut-title">'+s["donut_title"]+'</div>',html,count=1)
    o=os.path.join(OUT,"slide_05_abc_produto.html"); open(o,"w",encoding="utf-8").write(html); return o

# ============================================== SLIDE 06 (ABC cliente)
def gen_slide06():
    s=D["slide06_abc_cliente"]
    html=open(os.path.join(REF,"template_slide06.html"),encoding="utf-8").read()
    head=f'<div class="headline">\n    <div class="hl-main">\n      {s["headline"]}\n    </div>\n    <div class="hl-sub">{s["hl_sub"]}</div>\n  </div>\n\n  '+build_abc_cards(s["cards"])
    html=re.sub(r'<div class="headline">.*?<div class="abc-strip">.*?</div>\s*<div class="body">',head+'\n\n  <div class="body">',html,count=1,flags=re.DOTALL)
    blocks=[]
    for nv in s["niveis"]:
        pills="\n          ".join(f'<span class="pill pill-{nv["badge"]}">{nm}{" <span class=\"pill-new\">novo</span>" if isn else ""}</span>' for nm,isn in nv["pills"])
        blocks.append(f'<div class="nivel-block">\n        <div class="nivel-header">\n          <span class="nivel-badge badge-{nv["badge"]}">{nv["badge"].upper()}</span>\n          <span class="nivel-label">{nv["label"]}</span>\n          <span class="nivel-meta">{nv["meta"]}</span>\n        </div>\n        <div class="pills">\n          {pills}\n        </div>\n      </div>')
    seclbl=f'{META["mes"][:3].capitalize()}/{META["ano"]}'
    nivelcol='<div class="nivel-col">\n      <div class="sec-label">Distribuição por Nível — '+seclbl+'</div>\n      '+'\n      <div class="divider"></div>\n      '.join(blocks)+'\n    </div>'
    html=re.sub(r'<div class="nivel-col">.*?</div>\s*<div class="right">',nivelcol+'\n\n    <div class="right">',html,count=1,flags=re.DOTALL)
    co=[]
    for c in s["callouts"]:
        items="".join(f'<div class="c-item"><span class="arr {ARROW[it["a"]][0]}">{ARROW[it["a"]][1]}</span><span class="c-text">{it["t"]}</span></div>' for it in c["items"])
        co.append(f'<div>\n        <div class="callout-tag">{c["tag"]}</div>\n        <div class="c-items">{items}</div>\n      </div>')
    right='<div class="right">\n      '+'\n      <div class="rule"></div>\n      '.join(co)+'\n    </div>'
    html=re.sub(r'<div class="right">.*?</div>\s*</div>\s*</div>\s*<script',right+'\n  </div>\n</div>\n\n<script',html,count=1,flags=re.DOTALL)
    html=_donut(html,s["segs"],s["donut_center"])
    html=re.sub(r'<div class="donut-title">.*?</div>','<div class="donut-title">'+s["donut_title"]+'</div>',html,count=1)
    o=os.path.join(OUT,"slide_06_abc_cliente.html"); open(o,"w",encoding="utf-8").write(html); return o

# ============================================== SLIDE 07/08 (barras CSS)
def gen_bars_slide(nn, key, fname):
    s=D[key]
    html=open(os.path.join(REF,f"template_slide{nn}.html"),encoding="utf-8").read()
    html=re.sub(r'<div class="headline">.*?</div>','<div class="headline">\n    '+s["headline"]+'\n  </div>',html,count=1,flags=re.DOTALL)
    html=re.sub(r'<div class="subhl">.*?</div>','<div class="subhl">'+s["subhl"]+'</div>',html,count=1,flags=re.DOTALL)
    html=re.sub(r'<div class="chart-lbl">.*?</div>','<div class="chart-lbl">'+s["chart_lbl"]+'</div>',html,count=1,flags=re.DOTALL)
    html=re.sub(r'<div class="kpis">.*?</div>\s*<div class="body-grid">',build_kpis(s["kpis"])+'\n\n  <div class="body-grid">',html,count=1,flags=re.DOTALL)
    html=re.sub(r'<div class="bars">.*?</div>\s*</div>\s*</div>\s*<div class="xaxis">','<div class="bars">\n        '+build_cssbars(s["chart"])+'\n            </div>\n          </div>\n        </div>\n        <div class="xaxis">',html,count=1,flags=re.DOTALL)
    html=re.sub(r'<div class="side-col">.*?</div>\s*</div>\s*<div class="footer">',build_sidecol(s["sidecol"])+'\n  </div>\n\n  <div class="footer">',html,count=1,flags=re.DOTALL)
    o=os.path.join(OUT,fname); open(o,"w",encoding="utf-8").write(html); return o

# ============================================== SLIDE 01 (destaques bullets)
def gen_slide01():
    s=D["slide01_destaques"]
    html=open(os.path.join(REF,"template_slide01.html"),encoding="utf-8").read()
    for i,b in enumerate(s["bullets"],1): html=html.replace(f"%%BULLET_{i}%%",b)
    for k,v in s["tokens"].items(): html=html.replace(f"%%{k}%%",v)
    o=os.path.join(OUT,"slide_01_destaques.html"); open(o,"w",encoding="utf-8").write(html); return o

# ============================================== SLIDE 15 (óleo degomado)
def gen_slide15():
    s=D["slide15_oleo_degomado"]
    html=open(os.path.join(REF,"template_slide15.html"),encoding="utf-8").read()
    html=re.sub(r'<div class="hl-main">.*?</div>','<div class="hl-main">\n      '+s["headline"]+'\n    </div>',html,count=1,flags=re.DOTALL)
    html=re.sub(r'<div class="hl-sub">.*?</div>','<div class="hl-sub">'+s["hl_sub"]+'</div>',html,count=1,flags=re.DOTALL)
    # o template 15 usa .kpi-row (nao .kpis) — trocar o wrapper para manter o CSS
    kpis15=build_kpis(s["kpis"]).replace('<div class="kpis">','<div class="kpi-row">',1)
    html=re.sub(r'<div class="kpi-row">.*?</div>\s*<div class="body">',kpis15+'\n\n  <div class="body">',html,count=1,flags=re.DOTALL)
    html=re.sub(r'<div class="sec-label">Movimenta.*?</div>','<div class="sec-label">'+s["sec_mov"]+'</div>',html,count=1,flags=re.DOTALL)
    html=re.sub(r'<div class="sec-label">Faturamento.*?</div>','<div class="sec-label">'+s["sec_fat"]+'</div>',html,count=1,flags=re.DOTALL)
    def arr(nm,items,q=False):
        b=",".join(("'"+str(x).replace("'","\\'")+"'") if q else str(x) for x in items)
        return f"const {nm} = [{b}];"
    html=re.sub(r"const movLabels = \[.*?\];",arr("movLabels",s["mov_labels"],True),html,count=1,flags=re.DOTALL)
    html=re.sub(r"const movVals\s*= \[.*?\];",arr("movVals",s["mov_vals"]),html,count=1,flags=re.DOTALL)
    html=re.sub(r"const fatLabels = \[.*?\];",arr("fatLabels",s["fat_labels"],True),html,count=1,flags=re.DOTALL)
    html=re.sub(r"const fatVals\s*= \[.*?\];",arr("fatVals",s["fat_vals"]),html,count=1,flags=re.DOTALL)
    def col(callouts):
        blocks=[]
        for c in callouts:
            items="".join(f'<div class="c-item"><span class="arr {ARROW[it["a"]][0]}">{ARROW[it["a"]][1]}</span><span class="c-text">{it["t"]}</span></div>' for it in c["items"])
            blocks.append(f'<div>\n        <div class="callout-tag">{c["tag"]}</div>\n        <div class="c-items">{items}</div>\n      </div>')
        return '<div class="callout-col">\n      '+"\n      ".join(blocks)+'\n    </div>'
    # tolera comentarios HTML (<!-- GRAFICO FATURAMENTO -->) entre as colunas
    html=re.sub(r'<div class="callout-col">.*?</div>\s*</div>\s*(?:<!--.*?-->\s*)?<div class="chart-col">',col(s["callouts_mov"])+'\n\n    <div class="chart-col">',html,count=1,flags=re.DOTALL)
    # ancora no ULTIMO callout-col (o do Fat): sem o lookahead negativo o match
    # comecava no callout-col da Mov e engolia o grafico de Fat inteiro
    html=re.sub(r'<div class="callout-col">(?:(?!<div class="callout-col">).)*?</div>\s*</div>\s*</div>\s*<script',col(s["callouts_fat"])+'\n  </div>\n</div>\n\n<script',html,count=1,flags=re.DOTALL)
    o=os.path.join(OUT,"slide_15_oleo_degomado.html"); open(o,"w",encoding="utf-8").write(html); return o

# ============================================================ RUN
# mapa slide -> (rótulo, callable que retorna o caminho do arquivo)
DISPATCH = {
    "01": ("destaques",     lambda: gen_slide01()),
    "02": ("faturamento",   lambda: gen_slide02()),
    "03": ("carteira fat",  lambda: gen_slide03()),
    "04": ("carteira mov",  lambda: gen_slide04()),
    "05": ("abc produto",   lambda: gen_slide05()),
    "06": ("abc cliente",   lambda: gen_slide06()),
    "07": ("receita serv.", lambda: gen_bars_slide('07','slide07_receita_servico','slide_07_receita_servico.html')),
    "08": ("espaço m³",     lambda: gen_bars_slide('08','slide08_espaco_m3','slide_08_espaco_m3.html')),
    "09": ("mov acumulado", lambda: render_chart_slide('09','slide09_mov_acumulado','slide_09_mov_acumulada.html')),
    "10": ("mov maio",      lambda: render_chart_slide('10','slide10_mov_maio','slide_10_mov_historico.html')),
    "11": ("previsão",      lambda: render_chart_slide('11','slide11_previsao','slide_11_previsao.html')),
    "12": ("market share",  lambda: render_chart_slide('12','slide12_market_share','slide_12_market_share.html')),
    "13": ("ms derivados",  lambda: render_chart_slide('13','slide13_ms_derivados','slide_13_ms_derivados.html')),
    "14": ("ms soda",       lambda: gen_soda()[0]),
    "15": ("óleo degomado", lambda: gen_slide15()),
    "16": ("transpetro",    lambda: gen_transpetro()[0]),
    "18": ("top meses",     lambda: gen_top_meses()[0]),
}
ORDER = ["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","18"]

if __name__ == "__main__":
    import sys
    pedidos = [re.sub(r'\D','',a).zfill(2) for a in sys.argv[1:]]
    pedidos = [n for n in pedidos if n in DISPATCH]
    alvo = pedidos if pedidos else ORDER
    escopo = "slide "+", ".join(alvo) if pedidos else "deck completo (18 páginas)"
    print(f"== Gerando {escopo} · {META['ref']} ({META['janela_label']}) ==\n")
    for nn in ORDER:
        if nn not in alvo: continue
        rotulo, fn = DISPATCH[nn]
        path = fn()
        print(f"  [OK] slide {nn} {rotulo:14s} -> {os.path.basename(path)}")
    print("\n== Pronto. Tudo vem de references/dados_mes.json · zero edição por fora. ==")
