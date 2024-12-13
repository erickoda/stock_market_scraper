import puppeteer, { Page } from "puppeteer";
import ALL_TICKERS from "./tickers";
import fs from 'fs';

(async function main() {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const quotes = [];

  try {

    for (const ticker of ALL_TICKERS) {
      // Navigate the page to a URL
      await page.goto(`https://investidor10.com.br/acoes/${ticker.toLowerCase()}/`, {
        waitUntil: 'networkidle2',
      });
  
      // Set screen size
      await page.setViewport({width: 1080, height: 1024});
  
      console.log(`Extracting data from ${ticker}...`);
      const indicatorHistory = await extract_indications_history_data(page);
      console.log(`Extracting Quote Value...`);
      const quoteValue = await extract_quote_value(page);
      console.log(`Extracting Dividend History...`);
      const dividend_history = await extract_dividend_history(page);
      console.log(`Calculating Bazin Method...`);
      const bazin_max_value = calculates_bazin_method(dividend_history);
      console.log(`Calculating Graham Method...`);
      const graham_max_value = calculates_graham_method(indicatorHistory);
      console.log();
  
      const quoteData: QuoteData = {
        ticker: ticker,
        value: quoteValue,
        indicators: indicatorHistory,
        dividends_history: dividend_history,
        bazin_profit: bazin_max_value/quoteValue - 1,
        graham_profit: graham_max_value/quoteValue - 1
      };
  
      quotes.push(quoteData);
    }
    
  } catch (error) {
    persist_data(quotes);
  } finally {
    persist_data(quotes);
  }

  

  await browser.close();
})();

function persist_data(quotes: QuoteData[]): void {
  // Persist the data into a CSV file
  fs.writeFileSync('quotes.csv', 'Ticker,Value,Bazin Profit,Graham Profit\n');
  quotes.forEach(quote => {
    fs.appendFileSync('quotes.csv', `${quote.ticker},${quote.value},${quote.bazin_profit},${quote.graham_profit}\n`);
  });
}

function calculates_graham_method(indicators: IndicatorHistory[]): number {
  const earnings_per_share = indicators.find(indicator => indicator.indicator.toUpperCase() === 'LPA')?.values[0].value ?? 0;
  const book_value_per_share = indicators.find(indicator => indicator.indicator.toUpperCase() === 'VPA')?.values[0].value ?? 0;

  if (earnings_per_share < 0 || book_value_per_share < 0) {
    return 0;
  }

  return Math.sqrt(22.5 * earnings_per_share * book_value_per_share);
}

function calculates_bazin_method(dividends_history: Dividend[]): number {
  // If you don't have at least 3 years of dividends history, return 0
  if (dividends_history.length < 3) {
    return 0;
  }

  const avg_dividend_yield_five_years = (() => {
    let total = 0;
    const quantity_of_years = 3;
    const current_year = new Date().getFullYear();
    for (let i = current_year - 1; i > current_year - (quantity_of_years + 1); i--) {
      const dividend = dividends_history.find(dividend => dividend.year === i);

      if (!dividend)
        continue;

      total += dividend.value;
    }
    return total / quantity_of_years;
  })();

  return avg_dividend_yield_five_years / 0.06;
}

async function extract_dividend_history(page: Page): Promise<Dividend[]> {

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

  // console.log(JSON.stringify(dividend_tables, null, 2));

  return dividends_per_year;
}

async function extract_quote_value(page: Page): Promise<number> {
  const quote_value = await page.evaluate(() => {
    return Number(
      document
        .querySelector('.cotacao .value')
        ?.textContent
        ?.trim()
        .replaceAll('R$', '')
        .replaceAll('.', '')
        .replaceAll(',', '.') ?? 0
      );
  });

  return quote_value;
}

async function extract_indications_history_data(page: Page): Promise<IndicatorHistory[]> {
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

type QuoteData = {
  ticker: string;
  value: number;
  indicators: IndicatorHistory[];
  dividends_history: Dividend[];
  bazin_profit: number;
  graham_profit: number;
}

type Dividend = {
  year: number;
  value: number;
}

type IndicatorHistory = {
  indicator: string;
  values: {
    year: string;
    value: number;
  }[];
}