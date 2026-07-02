/**
 * Helpers de formatação que reproduzem EXATAMENTE o comportamento do Python
 * usado em gerar.py (f"{n:.1f}", round(), f"{n:,}", str(float)).
 * A regra de arredondamento do Python é half-to-even sobre o valor binário
 * exato do double — implementada aqui com BigInt para bater byte a byte
 * com os golden files.
 */

/** f"{x:.{dec}f}" do Python (arredondamento half-even sobre o double exato). */
export function pyFixed(x: number, dec: number): string {
  if (!Number.isFinite(x)) return String(x);
  const neg = x < 0 || Object.is(x, -0);
  const ax = Math.abs(x);
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, ax);
  const bits = dv.getBigUint64(0);
  const expBits = Number((bits >> 52n) & 0x7ffn);
  const fracBits = bits & 0xfffffffffffffn;
  let mant: bigint;
  let exp2: number;
  if (expBits === 0) {
    mant = fracBits;
    exp2 = -1074;
  } else {
    mant = fracBits | (1n << 52n);
    exp2 = expBits - 1075;
  }
  // valor exato = mant * 2^exp2 ; queremos round_half_even(valor * 10^dec)
  const p10 = 10n ** BigInt(dec);
  let num: bigint;
  let den: bigint;
  if (exp2 >= 0) {
    num = mant * p10 << BigInt(exp2);
    den = 1n;
  } else {
    num = mant * p10;
    den = 1n << BigInt(-exp2);
  }
  let q = num / den;
  const r = num % den;
  const twice = r * 2n;
  if (twice > den || (twice === den && (q & 1n) === 1n)) q += 1n;
  let s = q.toString();
  if (dec > 0) {
    s = s.padStart(dec + 1, '0');
    s = s.slice(0, s.length - dec) + '.' + s.slice(s.length - dec);
  }
  return neg ? '-' + s : s;
}

/** round(x) do Python sem dígitos → inteiro com half-even. */
export function pyRound(x: number): number {
  return Number(pyFixed(x, 0));
}

/** round(x, n) do Python → double mais próximo do decimal arredondado. */
export function pyRoundDigits(x: number, n: number): number {
  return Number.parseFloat(pyFixed(x, n));
}

/** repr/str de float do Python: inteiro vira "87.0"; demais = shortest repr. */
export function pyFloatRepr(x: number): string {
  if (Number.isInteger(x)) return x.toFixed(1);
  return String(x);
}

/** str(x) do Python para números vindos do manifesto (int → sem ponto). */
export function pyNumStr(x: number): string {
  if (Number.isInteger(x)) return String(x);
  return pyFloatRepr(x);
}

/** f"{n:,}" do Python para inteiros (separador de milhar por vírgula). */
export function intComma(n: number): string {
  const neg = n < 0;
  const digits = Math.trunc(Math.abs(n)).toString();
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ',';
    out += digits[i];
  }
  return neg ? '-' + out : out;
}

/** br(n, dec=1) de gerar.py: formata e troca ponto por vírgula. */
export function br(n: number, dec = 1): string {
  return pyFixed(n, dec).replace('.', ',');
}

/** kfmt(v) de gerar.py: 41667 -> "41,7k". */
export function kfmt(v: number): string {
  return br(v / 1000, 1) + 'k';
}

/** js_list de gerar.py. */
export function jsList(lst: (string | number)[], quote = true): string {
  if (quote) return '[' + lst.map((x) => `'${x}'`).join(',') + ']';
  return '[' + lst.map((x) => pyNumStr(Number(x))).join(',') + ']';
}

/** "maio"[:3].capitalize() do Python. */
export function pyCapitalize3(s: string): string {
  const t = s.slice(0, 3);
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** "%d" do Python (trunca em direção a zero). */
export function pyD(x: number): string {
  return String(Math.trunc(x));
}

/**
 * re.sub(pattern, repl, html, count=1, flags=DOTALL) com repl literal
 * (equivalente ao repl com backslashes escapados no Python).
 */
export function reSub(html: string, pattern: RegExp, repl: string): string {
  return html.replace(pattern, () => repl);
}

/** str.replace do Python (todas as ocorrências, sem regex). */
export function replaceAll(html: string, needle: string, repl: string): string {
  return html.split(needle).join(repl);
}
