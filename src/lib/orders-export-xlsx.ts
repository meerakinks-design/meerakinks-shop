import writeXlsxFile, { type Cell } from 'write-excel-file/node';
import { isExportDateTime, ORDERS_EXPORT_COLUMNS, toExcelSerial, type ExportCell, type ExportTable } from '@/lib/orders-export';

// Fichier Excel (.xlsx) de l'export des commandes. Bibliothèque : `write-excel-file` (1 dépendance, ~2 Mo) plutôt
// que `exceljs` (~22 Mo, 9 dépendances) : on n'écrit qu'une feuille simple, jamais de lecture (docs/EXPORT-COMMANDES.md).

const SHEET_NAME = 'Commandes';
const MONEY_FORMAT = '#,##0';
const DATE_TIME_FORMAT = 'dd/mm/yyyy hh:mm';

type SheetCell = NonNullable<Cell>;

function toSheetCell(cell: ExportCell): SheetCell | null {
  if (cell === null || cell === '') return null;
  if (typeof cell === 'number') return { value: cell, type: Number, format: MONEY_FORMAT, alignVertical: 'top' };
  if (isExportDateTime(cell)) return { value: toExcelSerial(cell.at), type: Number, format: DATE_TIME_FORMAT, alignVertical: 'top' };
  return { value: cell, type: String, wrap: true, alignVertical: 'top' };
}

/** Une feuille « Commandes » : en-têtes en gras et figés, largeurs de colonnes, retours à la ligne dans les cellules de texte. */
export async function toXlsx(table: ExportTable): Promise<Buffer> {
  const header: SheetCell[] = table.headers.map((value) => ({ value, type: String, fontWeight: 'bold', wrap: true, alignVertical: 'center' }));
  const sheetData = [header, ...table.rows.map((row) => row.map(toSheetCell))];
  const output = await writeXlsxFile(sheetData, {
    sheet: SHEET_NAME,
    columns: ORDERS_EXPORT_COLUMNS.map((column) => ({ width: column.width })),
    stickyRowsCount: 1,
  }).toBuffer();
  return Buffer.from(output);
}
