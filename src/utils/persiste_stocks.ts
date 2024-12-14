import QuoteData from "../types/stock";
import fs from 'fs';

export default function persist_stocks(quotes: QuoteData[]): void {
  // Persist the data into a CSV file
  fs.writeFileSync('quotes.csv', 'Ticker,Value,Bazin Profit,Graham Profit\n');
  quotes.forEach(quote => {
    fs.appendFileSync('quotes.csv', `${quote.ticker},${quote.value},${quote.bazin_profit},${quote.graham_profit}\n`);
  });
}