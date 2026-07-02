/** Tipos do ETL: Excel bruto → mapeamento → manifesto. */

/** Uma aba de Excel já parseada pelo SheetJS. */
export interface SheetData {
  file: string;
  sheet: string;
  /** linhas como objetos usando a primeira linha não vazia como header */
  rows: Record<string, unknown>[];
  headers: string[];
}

/** Datasets lógicos que o ETL consome. */
export type DatasetKey =
  | 'fat_realizado'      // banco de dados de faturamento (mensal, cliente×produto×serviço)
  | 'fat_orcado'         // faturamento orçado (mensal, cliente×produto)
  | 'mov_terminal'       // movimentação por terminal (market share, soda, transpetro)
  | 'mov_cliente'        // movimentação realizada por cliente (slide 04/15)
  | 'mov_orcada'         // movimentação orçada (slides 09/10/11)
  | 'previsao_mov';      // previsão de movimentação (slide 11)

/** Campos lógicos por dataset → nome real da coluna no Excel. */
export interface DatasetMapping {
  file: string;
  sheet: string;
  columns: Record<string, string>;
}

export interface MappingConfig {
  version: 1;
  criadoEm: string;
  datasets: Partial<Record<DatasetKey, DatasetMapping>>;
}

/** Campos lógicos esperados por dataset (para o assistente de mapeamento). */
export const DATASET_FIELDS: Record<DatasetKey, { field: string; label: string; required: boolean; hints: string[] }[]> = {
  fat_realizado: [
    { field: 'ano', label: 'Ano', required: true, hints: ['ANO'] },
    { field: 'mes', label: 'Mês', required: true, hints: ['MÊS', 'MES'] },
    { field: 'cliente', label: 'Cliente (grupo)', required: true, hints: ['Grupo de Cliente', 'Cliente'] },
    { field: 'servico', label: 'Grupo de Serviço', required: false, hints: ['Grupo de Serviço', 'Serviço'] },
    { field: 'produto', label: 'Produto', required: false, hints: ['PRODUTO'] },
    { field: 'grupo', label: 'Grupo de Produtos', required: true, hints: ['GRUPO DE PRODUTOS'] },
    { field: 'ton', label: 'Espaço Faturado (TON)', required: false, hints: ['Espaço Faturado (TON)', 'TON'] },
    { field: 'm3', label: 'Espaço Faturado (m³)', required: false, hints: ['Espaço Faturado  (m³)', 'm³', 'M3'] },
    { field: 'valor', label: 'Faturamento (R$)', required: true, hints: ['Faturamento (R$)', 'Faturamento'] },
    { field: 'contrato', label: 'Grupo de Contratos', required: false, hints: ['GRUPO DE CONTRATOS', 'Tipo de contrato'] },
  ],
  fat_orcado: [
    { field: 'ano', label: 'Ano', required: true, hints: ['ANO'] },
    { field: 'mes', label: 'Mês', required: true, hints: ['MÊS', 'MES'] },
    { field: 'cliente', label: 'Cliente (grupo)', required: false, hints: ['Grupo de Cliente', 'Cliente'] },
    { field: 'grupo', label: 'Grupo de Produtos', required: true, hints: ['GRUPO DE PRODUTOS'] },
    { field: 'valor', label: 'Faturamento (R$)', required: true, hints: ['Faturamento (R$)', 'Faturamento'] },
  ],
  mov_terminal: [
    { field: 'terminal', label: 'Terminal', required: true, hints: ['TERMINAL'] },
    { field: 'ano', label: 'Ano', required: true, hints: ['ANO'] },
    { field: 'mes', label: 'Mês', required: true, hints: ['MÊS', 'MES'] },
    { field: 'produto', label: 'Produto', required: false, hints: ['PRODUTO'] },
    { field: 'grupo', label: 'Grupo de Produtos', required: true, hints: ['GRUPO DE PRODUTOS'] },
    { field: 'ton', label: 'Mov (TON)', required: true, hints: ['Mov (TON)', 'TON'] },
  ],
  mov_cliente: [
    { field: 'cliente', label: 'Cliente', required: true, hints: ['Cliente'] },
    { field: 'produto', label: 'Produto', required: true, hints: ['Produto'] },
    { field: 'grupo', label: 'Grupo (produto)', required: false, hints: ['GRUPO2', 'Grupo'] },
    { field: 'ton', label: 'Quantidade (Tons)', required: true, hints: ['Quantidade (Tons)', 'Tons'] },
    { field: 'mesnum', label: 'Mês (número)', required: true, hints: ['MêsNum', 'MES'] },
    { field: 'ano', label: 'Ano', required: true, hints: ['ANO'] },
  ],
  mov_orcada: [
    { field: 'ano', label: 'Ano', required: true, hints: ['ANO'] },
    { field: 'mes', label: 'Mês', required: true, hints: ['MÊS', 'MES'] },
    { field: 'grupo', label: 'Grupo de Produtos', required: true, hints: ['GRUPO DE PRODUTOS'] },
    { field: 'ton', label: 'Movimentação (TON)', required: true, hints: ['Movimentação(TON)', 'TON'] },
  ],
  previsao_mov: [
    { field: 'ano', label: 'Ano', required: true, hints: ['Ano', 'ANO'] },
    { field: 'mes', label: 'Mês (atributo)', required: true, hints: ['Atributo', 'MÊS'] },
    { field: 'produto', label: 'Produto', required: false, hints: ['Produto'] },
    { field: 'valor', label: 'Valor (TON)', required: true, hints: ['Valor'] },
  ],
};

export const DATASET_LABELS: Record<DatasetKey, string> = {
  fat_realizado: 'Faturamento Realizado (banco de dados mensal)',
  fat_orcado: 'Faturamento Orçado (banco de dados mensal)',
  mov_terminal: 'Movimentação por Terminal (market share)',
  mov_cliente: 'Movimentação Realizada por Cliente',
  mov_orcada: 'Movimentação Orçada',
  previsao_mov: 'Previsão de Movimentação (TON)',
};

/** Pendência de override: campo que o Excel não entrega com confiança. */
export interface Pendencia {
  id: string;
  slide: string;               // '01'..'18'
  campo: string;               // caminho no manifesto, ex. 'slide13_ms_derivados'
  rotulo: string;              // explicação de onde vem o dado
  severidade: 'warn' | 'block';
  resolvida: boolean;
}

export interface ValidationIssue {
  slide: string;
  msg: string;
  severidade: 'warn' | 'error';
}
