/**
 * Templates canônicos carregados VERBATIM da skill (report-bi/references/).
 * Regra de Ouro 1: nunca recriar CSS/estilo — só trocar dados.
 */
import t01 from '../../report-bi/references/template_slide01.html?raw';
import t02 from '../../report-bi/references/template_slide02.html?raw';
import t03 from '../../report-bi/references/template_slide03.html?raw';
import t04 from '../../report-bi/references/template_slide04.html?raw';
import t05 from '../../report-bi/references/template_slide05.html?raw';
import t06 from '../../report-bi/references/template_slide06.html?raw';
import t07 from '../../report-bi/references/template_slide07.html?raw';
import t08 from '../../report-bi/references/template_slide08.html?raw';
import t09 from '../../report-bi/references/template_slide09.html?raw';
import t10 from '../../report-bi/references/template_slide10.html?raw';
import t11 from '../../report-bi/references/template_slide11.html?raw';
import t12 from '../../report-bi/references/template_slide12.html?raw';
import t13 from '../../report-bi/references/template_slide13.html?raw';
import t14 from '../../report-bi/references/template_slide14.html?raw';
import t15 from '../../report-bi/references/template_slide15.html?raw';
import t16 from '../../report-bi/references/template_slide16.html?raw';
import t18 from '../../report-bi/references/template_slide18.html?raw';
import sodaTmpl from './templates/soda.html?raw';
import transpTmpl from './templates/transp.html?raw';
import topTmpl from './templates/top.html?raw';

export const TEMPLATES: Record<string, string> = {
  '01': t01, '02': t02, '03': t03, '04': t04, '05': t05, '06': t06,
  '07': t07, '08': t08, '09': t09, '10': t10, '11': t11, '12': t12,
  '13': t13, '14': t14, '15': t15, '16': t16, '18': t18,
};

/** Templates que em gerar.py são strings inline (SODA_TMPL, TRANSP_TMPL, TOP_TMPL). */
export const SODA_TMPL = sodaTmpl;
export const TRANSP_TMPL = transpTmpl;
export const TOP_TMPL = topTmpl;
