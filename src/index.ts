import Stock from "./types/stock.js";
import extract_dividend_history from "./scrap/extract_dividend_history.js";
import extract_indicators_history_data from "./scrap/extract_indicators_history_data.js";
import extract_quote_value from "./scrap/extract_quote_value.js";
import calculates_bazin_max_price from "./utils/calculates_bazin_max_price.js";
import calculates_graham_max_price from "./utils/calculates_graham_max_price.js";
import persist_stocks from "./utils/persiste_stocks.js";
import { Page } from "puppeteer";
import ALL_TICKERS from "./mocked/tickers.js";
import { Cluster } from "puppeteer-cluster";

(async function main() {
  const stocks: Stock[] = [];

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 10,
    puppeteerOptions: { headless: true },
  });

  await cluster.task(async ({ page, data: ticker }) => {
    const stock = await getStock(page, ticker);
    if (stock)
      stocks.push(stock);
  });

  try {
    for (const ticker of ALL_TICKERS) {
      cluster.queue(ticker);
    }
    
  } catch (error) {
    console.error(error);
    await cluster.idle();
    await cluster.close();

    persist_stocks(stocks);
  } finally {
    await cluster.idle();
    await cluster.close();

    persist_stocks(stocks);
  }

})();

async function getStock(page: Page, ticker: string): Promise<Stock> {

  // Navigate the page to a URL
  await page.goto(`https://investidor10.com.br/acoes/${ticker.toLowerCase()}/`, {
    waitUntil: 'networkidle2',
  });

  // Set screen size
  await page.setViewport({width: 1080, height: 1024});

  console.log(`Extracting data from ${ticker}...`);
  const indicatorHistory = await extract_indicators_history_data(page);

  console.log(`Extracting Quote Value...`);
  const quoteValue = await extract_quote_value(page);

  console.log(`Extracting Dividend History...`);
  const dividend_history = await extract_dividend_history(page);

  console.log(`Calculating Bazin Method...`);
  const bazin_max_value = calculates_bazin_max_price(dividend_history);

  console.log(`Calculating Graham Method...`);
  const graham_max_value = calculates_graham_max_price(indicatorHistory);
  console.log();

  const stock: Stock = {
    ticker: ticker,
    value: quoteValue,
    indicators: indicatorHistory,
    dividends_history: dividend_history,
    bazin_profit: bazin_max_value/quoteValue - 1,
    graham_profit: graham_max_value/quoteValue - 1
  };

  return stock;
}