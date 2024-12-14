import { Page } from "puppeteer";
import IndicatorHistory from "../types/indicator_history";

export default async function extract_indicators_history_data(page: Page): Promise<IndicatorHistory[]> {
  // Get Indicators History Data
  const tableData = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#table-indicators-history tr'));
    return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells.map(cell => cell.textContent?.trim());
    });
  });

  // Extract Header
  const header: string[] = (() => {
    const header = tableData.shift();
    header?.shift(); // discard the first cell
    let not_undefined_header = header ?? [];
    let header_with_no_undefined_inside_value = not_undefined_header.map((value) => value ? value : "");
    return header_with_no_undefined_inside_value;
  })();

  // Extract and Parse The Indicators History
  const indicatorHistory: IndicatorHistory[] = tableData.map(row => {
    const indicator = row.shift();
    return {
      indicator: indicator || '',
      values: row.map((value, index) => ({
        year: header[index] || '',
        value: Number((value || '').replaceAll('%', '').replaceAll('.', '').replaceAll(',', '.'))
      }))
    };
  });

  return indicatorHistory;
}
