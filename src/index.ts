import puppeteer from "puppeteer";
import ALL_TICKERS from "./mocked/tickers";
import Stock from "./types/stock";
import extract_dividend_history from "./scrap/extract_dividend_history";
import extract_indicators_history_data from "./scrap/extract_indicators_history_data";
import extract_quote_value from "./scrap/extract_quote_value";
import calculates_bazin_max_price from "./utils/calculates_bazin_max_price";
import calculates_graham_max_price from "./utils/calculates_graham_max_price";
import persist_stocks from "./utils/persiste_stocks";

(async function main() {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const stocks: Stock[] = [];

  try {

    for (const ticker of ALL_TICKERS) {
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
  
      stocks.push(stock);
    }
    
  } catch (error) {
    persist_stocks(stocks);
  } finally {
    persist_stocks(stocks);
  }

  await browser.close();
})();
