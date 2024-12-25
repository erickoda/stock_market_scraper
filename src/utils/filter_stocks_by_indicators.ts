import Stock from "../types/stock.js";

export default function filterStocksByIndicators(
  stocks: Stock[],
): Stock[] {

  const MAX_PL = 15.;
  const MIN_PL = 1.;

  const MAX_PVP = 1.75;
  const MIN_PVP = 0.70;

  const MIN_ROE_AVG = 0.15;

  const MIN_BAZIN_PROFIT = 0.5;
  const MIN_GRAHAM_PROFIT = 0.5;

  const filteredStocks = stocks.filter((stock) => {
    const indicators = stock.indicators;

    const pl = indicators.find((indicator) => indicator.indicator === 'P/L')?.values[0].value ?? 0;
    const pvp = indicators.find((indicator) => indicator.indicator === 'P/VP')?.values[0].value ?? 0;
    const roe_avg = (() => {
      const roe = indicators.find((indicator) => indicator.indicator === 'ROE')?.values ?? [];
      return roe.reduce((accumulated, current) => accumulated + current.value, 0) / roe.length;
    })();
    const bazin_profit = stock.bazin_profit ?? 0;
    const graham_profit = stock.graham_profit ?? 0;

    return (
      pl >= MIN_PL && pl <= MAX_PL &&
      pvp >= MIN_PVP && pvp <= MAX_PVP &&
      roe_avg >= MIN_ROE_AVG &&
      bazin_profit >= MIN_BAZIN_PROFIT &&
      graham_profit >= MIN_GRAHAM_PROFIT
    );
  });

  return filteredStocks;
}