import QuoteData from "../types/stock.js";
import fs from 'fs';

export default function persist_stocks(quotes: QuoteData[], file_name: string): void {
  // Persist the data into a CSV file
  fs.writeFileSync(
    file_name,
    'Ticker;Value;Bazin Profit;Graham Profit;P/L;P/VP;ROE;PAYOUT;MARGEM LÍQUIDA;CAGR RECEITAS 5 ANOS;CAGR LUCROS 5 ANOS\n'
  );
  quotes.forEach(quote => {
    const indicators = quote.indicators;

    function convertFloatToString(num: number): string {
      return num.toFixed(8).replace('.', ',');
    }

    const pl = convertFloatToString(indicators.find((indicator) => indicator.indicator === 'P/L')?.values[0].value ?? 0);
    const pvp = convertFloatToString(indicators.find((indicator) => indicator.indicator === 'P/VP')?.values[0].value ?? 0);
    const roe_avg = (() => {
      const roe = indicators.find((indicator) => indicator.indicator === 'ROE')?.values ?? [];
      return convertFloatToString(roe.reduce((accumulated, current) => accumulated + current.value, 0) / roe.length);
    })();
    const payout = convertFloatToString(indicators.find((indicator) => indicator.indicator === 'PAYOUT')?.values[0].value ?? 0);
    const margem_liquida = convertFloatToString(indicators.find((indicator) => indicator.indicator === 'MARGEM LÍQUIDA')?.values[0].value ?? 0);
    const cagr_receitas_5_anos = convertFloatToString(indicators.find((indicator) => indicator.indicator === 'CAGR RECEITAS 5 ANOS')?.values[0].value ?? 0);
    const cagr_lucros_5_anos = convertFloatToString(indicators.find((indicator) => indicator.indicator === 'CAGR LUCROS 5 ANOS')?.values[0].value ?? 0);

    fs.appendFileSync(
      file_name,
      `${quote.ticker};${convertFloatToString(quote.value)};${convertFloatToString(quote.bazin_profit)};${convertFloatToString(quote.graham_profit)};${pl};${pvp};${roe_avg};${payout};${margem_liquida};${cagr_receitas_5_anos};${cagr_lucros_5_anos}\n`
    );
  });
}