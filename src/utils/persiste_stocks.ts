import QuoteData from "../types/stock.js";
import fs from 'fs';

export default function persist_stocks(quotes: QuoteData[]): void {
  // Persist the data into a CSV file
  fs.writeFileSync('stocks.csv', 'Ticker,Value,Bazin Profit,Graham Profit\n');
  quotes.forEach(quote => {
    fs.appendFileSync('stocks.csv', `${quote.ticker},${quote.value},${quote.bazin_profit},${quote.graham_profit}\n`);
  });
}