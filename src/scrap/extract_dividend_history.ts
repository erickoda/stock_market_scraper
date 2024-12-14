import { Page } from "puppeteer";
import Dividend from "../types/dividend";

export default async function extract_dividend_history(page: Page): Promise<Dividend[]> {

  const dividend_tables = [];
  let dividends_per_year: Dividend[] = [];

  const hasComponent = await page.$('#table-dividends-history tr') !== null;
  if (!hasComponent)
    return dividends_per_year;

  for (let i = 0; i < 50; i++) {

    // extract current table dividend data
    const dividend_table_data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#table-dividends-history tr'));
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells.map(cell => cell.textContent?.trim());
      });
    });

    function compareMatrixes(matrix1: (string | undefined)[][], matrix2: (string | undefined)[][]): boolean {
      if (matrix1.length !== matrix2.length) {
        return false;
      }

      for (let i = 0; i < matrix1.length; i++) {
        if (matrix1[i].length !== matrix2[i].length) {
          return false;
        }

        for (let j = 0; j < matrix1[i].length; j++) {
          if (matrix1[i][j] !== matrix2[i][j]) {
            return false;
          }
        }
      }

      return true;
    }

    if (dividend_tables.length > 0 && compareMatrixes(dividend_tables[dividend_tables.length - 1], dividend_table_data)) {
      break;
    }

    dividend_tables.push(dividend_table_data);

    // Click on the next page
    await page.locator('#table-dividends-history_next').click();
  }

  // Calculate the dividends per year
  for (const table of dividend_tables) {
    for (const row of table) {
      if (!Number(row[1]?.split('/')[2])) {
        continue;
      }

      if (dividends_per_year.find(dividend => dividend.year === Number(row[1]?.split('/')[2])) === undefined) {
        dividends_per_year.push({
          year: Number(row[1]?.split('/')[2]),
          value: Number(row[3]?.replaceAll('R$', '').replaceAll('.', '').replaceAll(',', '.'))
        });

        continue;
      }

      dividends_per_year = dividends_per_year.map(dividend => {
        if (dividend.year === Number(row[1]?.split('/')[2])) {
          dividend.value += Number(row[3]?.replaceAll('R$', '').replaceAll('.', '').replaceAll(',', '.'));
        }
        return dividend;
      });
    }
  }

  return dividends_per_year;
}