import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import XlsxPopulate from 'xlsx-populate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_TEMPLATE_PATH = path.resolve(__dirname, '../templates/analytics-report-template.xlsx');

const RAW_DATA_HEADERS = [
  'Date',
  'Vendor',
  'Product',
  'Category',
  'Revenue',
  'Platform Profit',
  'Vendor Earnings',
  'Delivery Profit',
  'Delivery Earnings',
];
const SALES_BY_DATE_HEADERS = ['Date', 'Revenue', 'Platform Profit', 'Vendor Earnings', 'Delivery Profit', 'Delivery Earnings', 'Quantity'];
const SALES_BY_CATEGORY_HEADERS = ['Category', 'Revenue', 'Platform Profit', 'Vendor Earnings', 'Delivery Profit', 'Delivery Earnings', 'Quantity'];
const SALES_BY_VENDOR_HEADERS = ['Vendor', 'VendorId', 'Revenue', 'Platform Profit', 'Vendor Earnings', 'Quantity'];
const SALES_BY_PRODUCT_HEADERS = ['Product', 'ProductId', 'Category', 'Revenue', 'Platform Profit', 'Vendor Earnings', 'Quantity'];

const SUMMARY_FALLBACKS = {
  TotalRevenue: 'B2',
  PlatformProfit: 'B3',
  VendorEarnings: 'B4',
  DeliveryProfit: 'B5',
  DeliveryEarnings: 'B6',
};

const CHART_SHEET_NAMES = ['RawData', 'Summary', 'Charts', 'SalesByDate', 'SalesByCategory', 'SalesByVendor', 'SalesByProduct'];

const headerStyle = {
  bold: true,
  fill: '1F4E78',
  fontColor: 'FFFFFF',
  horizontalAlignment: 'center',
};

const ensureTemplateExists = async (templatePath) => {
  try {
    await fs.access(templatePath);
    return true;
  } catch {
    return false;
  }
};

const getOrCreateSheet = (workbook, sheetName) => workbook.sheet(sheetName) || workbook.addSheet(sheetName);

const ensureTemplateSkeleton = (workbook) => {
  for (const sheetName of CHART_SHEET_NAMES) {
    getOrCreateSheet(workbook, sheetName);
  }

  const sheet1 = workbook.sheet('Sheet1');
  if (sheet1 && !CHART_SHEET_NAMES.includes(sheet1.name())) {
    workbook.deleteSheet(sheet1);
  }
};

const clearSheetData = (sheet, lastColumnLetter) => {
  const usedRange = sheet.usedRange();
  if (usedRange && usedRange.endCell().rowNumber() >= 2) {
    sheet.range(`A2:${lastColumnLetter}${usedRange.endCell().rowNumber()}`).clear();
  }
};

const writeTable = ({ sheet, headers, rows, dateColumns = [], numberColumns = [], percentColumns = [] }) => {
  const endColumn = String.fromCharCode(64 + headers.length);
  sheet.cell('A1').value([headers]);
  sheet.range(`A1:${endColumn}1`).style(headerStyle);
  clearSheetData(sheet, endColumn);

  if (rows.length > 0) {
    sheet.cell('A2').value(rows);
  }

  headers.forEach((header, index) => {
    const columnLetter = String.fromCharCode(65 + index);
    const width = Math.max(14, Math.min(28, header.length + 6));
    sheet.column(columnLetter).width(width);
  });

  if (rows.length === 0) {
    return;
  }

  const lastRow = rows.length + 1;

  for (const columnLetter of dateColumns) {
    sheet.range(`${columnLetter}2:${columnLetter}${lastRow}`).style('numberFormat', 'yyyy-mm-dd');
    sheet.column(columnLetter).width(14);
  }

  for (const columnLetter of numberColumns) {
    sheet.range(`${columnLetter}2:${columnLetter}${lastRow}`).style('numberFormat', '#,##0.00');
  }

  for (const columnLetter of percentColumns) {
    sheet.range(`${columnLetter}2:${columnLetter}${lastRow}`).style('numberFormat', '0.00%');
  }
};

const writeNamedOrFallbackCell = ({ workbook, sheet, definedName, placeholder, fallbackCell, value, numberFormat }) => {
  const namedTarget = workbook.definedName(definedName) || sheet.definedName(definedName);

  if (namedTarget?.value) {
    namedTarget.value(value);
    if (numberFormat) namedTarget.style('numberFormat', numberFormat);
    return;
  }

  const placeholderCells = sheet.find(placeholder);
  if (placeholderCells.length > 0) {
    placeholderCells.forEach((cell) => {
      cell.value(value);
      if (numberFormat) cell.style('numberFormat', numberFormat);
    });
    return;
  }

  sheet.cell(fallbackCell).value(value);
  if (numberFormat) {
    sheet.cell(fallbackCell).style('numberFormat', numberFormat);
  }
};

const writeSummarySheet = ({ workbook, sheet, analytics, filters }) => {
  sheet.cell('A1').value('Analytics Summary').style({ bold: true, fontSize: 16 });
  sheet.cell('A2').value('Total Revenue');
  sheet.cell('A3').value('Platform Profit');
  sheet.cell('A4').value('Vendor Earnings');
  sheet.cell('A5').value('Delivery Profit');
  sheet.cell('A6').value('Delivery Earnings');
  sheet.cell('D2').value('Range');
  sheet.cell('D3').value('Vendor Filter');
  sheet.cell('D4').value('Category Filter');

  writeNamedOrFallbackCell({
    workbook,
    sheet,
    definedName: 'TotalRevenue',
    placeholder: '{{TOTAL_REVENUE}}',
    fallbackCell: SUMMARY_FALLBACKS.TotalRevenue,
    value: Number(analytics.totals.revenue || 0),
    numberFormat: '#,##0.00',
  });
  writeNamedOrFallbackCell({
    workbook,
    sheet,
    definedName: 'PlatformProfit',
    placeholder: '{{PLATFORM_PROFIT}}',
    fallbackCell: SUMMARY_FALLBACKS.PlatformProfit,
    value: Number(analytics.totals.platformProfit || 0),
    numberFormat: '#,##0.00',
  });
  writeNamedOrFallbackCell({
    workbook,
    sheet,
    definedName: 'VendorEarnings',
    placeholder: '{{VENDOR_EARNINGS}}',
    fallbackCell: SUMMARY_FALLBACKS.VendorEarnings,
    value: Number(analytics.totals.vendorEarnings || 0),
    numberFormat: '#,##0.00',
  });
  writeNamedOrFallbackCell({
    workbook,
    sheet,
    definedName: 'DeliveryProfit',
    placeholder: '{{DELIVERY_PROFIT}}',
    fallbackCell: SUMMARY_FALLBACKS.DeliveryProfit,
    value: Number(analytics.totals.deliveryProfit || 0),
    numberFormat: '#,##0.00',
  });
  writeNamedOrFallbackCell({
    workbook,
    sheet,
    definedName: 'DeliveryEarnings',
    placeholder: '{{DELIVERY_EARNINGS}}',
    fallbackCell: SUMMARY_FALLBACKS.DeliveryEarnings,
    value: Number(analytics.totals.deliveryEarnings || 0),
    numberFormat: '#,##0.00',
  });

  sheet.cell('E2').value(filters.range === 'custom'
    ? `${filters.startDate || ''} to ${filters.endDate || ''}`
    : filters.range
  );
  sheet.cell('E3').value(filters.vendorId || 'All');
  sheet.cell('E4').value(filters.categoryId || 'All');

  ['A', 'B', 'D', 'E'].forEach((columnLetter) => {
    sheet.column(columnLetter).width(18);
  });
};

export const buildAnalyticsReportWorkbook = async ({ rawData, analytics, filters }) => {
  const templatePath = process.env.ANALYTICS_REPORT_TEMPLATE_PATH
    ? path.resolve(process.cwd(), process.env.ANALYTICS_REPORT_TEMPLATE_PATH)
    : DEFAULT_TEMPLATE_PATH;

  const workbook = await (async () => {
    if (await ensureTemplateExists(templatePath)) {
      return XlsxPopulate.fromFileAsync(templatePath);
    }
    return XlsxPopulate.fromBlankAsync();
  })();

  ensureTemplateSkeleton(workbook);

  const rawDataSheet = getOrCreateSheet(workbook, 'RawData');
  const summarySheet = getOrCreateSheet(workbook, 'Summary');
  const salesByDateSheet = getOrCreateSheet(workbook, 'SalesByDate');
  const salesByCategorySheet = getOrCreateSheet(workbook, 'SalesByCategory');
  const salesByVendorSheet = getOrCreateSheet(workbook, 'SalesByVendor');
  const salesByProductSheet = getOrCreateSheet(workbook, 'SalesByProduct');

  writeTable({
    sheet: rawDataSheet,
    headers: RAW_DATA_HEADERS,
    rows: rawData.map((row) => ([
      new Date(row.createdAt),
      row.vendor || 'Unknown Vendor',
      row.product || row.productId,
      row.category || 'Uncategorized',
      Number(row.revenue || 0),
      Number(row.platformProfit || 0),
      Number(row.vendorEarnings || 0),
      Number(row.deliveryProfit || 0),
      Number(row.deliveryEarnings || 0),
    ])),
    dateColumns: ['A'],
    numberColumns: ['E', 'F', 'G', 'H', 'I'],
  });

  writeTable({
    sheet: salesByDateSheet,
    headers: SALES_BY_DATE_HEADERS,
    rows: analytics.salesByDate.map((row) => ([
      new Date(`${row.date}T00:00:00Z`),
      Number(row.revenue || 0),
      Number(row.platformProfit || 0),
      Number(row.vendorEarnings || 0),
      Number(row.deliveryProfit || 0),
      Number(row.deliveryEarnings || 0),
      Number(row.quantity || 0),
    ])),
    dateColumns: ['A'],
    numberColumns: ['B', 'C', 'D', 'E', 'F', 'G'],
  });

  writeTable({
    sheet: salesByCategorySheet,
    headers: SALES_BY_CATEGORY_HEADERS,
    rows: analytics.salesByCategory.map((row) => ([
      row.category,
      Number(row.revenue || 0),
      Number(row.platformProfit || 0),
      Number(row.vendorEarnings || 0),
      Number(row.deliveryProfit || 0),
      Number(row.deliveryEarnings || 0),
      Number(row.quantity || 0),
    ])),
    numberColumns: ['B', 'C', 'D', 'E', 'F', 'G'],
  });

  writeTable({
    sheet: salesByVendorSheet,
    headers: SALES_BY_VENDOR_HEADERS,
    rows: analytics.salesByVendor.map((row) => ([
      row.vendor,
      row.vendorId,
      Number(row.revenue || 0),
      Number(row.platformProfit || 0),
      Number(row.vendorEarnings || 0),
      Number(row.quantity || 0),
    ])),
    numberColumns: ['C', 'D', 'E', 'F'],
  });

  writeTable({
    sheet: salesByProductSheet,
    headers: SALES_BY_PRODUCT_HEADERS,
    rows: analytics.salesByProduct.map((row) => ([
      row.product,
      row.productId,
      row.category,
      Number(row.revenue || 0),
      Number(row.platformProfit || 0),
      Number(row.vendorEarnings || 0),
      Number(row.quantity || 0),
    ])),
    numberColumns: ['D', 'E', 'F', 'G'],
  });

  writeSummarySheet({ workbook, sheet: summarySheet, analytics, filters });

  return workbook.outputAsync();
};
