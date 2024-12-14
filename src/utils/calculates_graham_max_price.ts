import IndicatorHistory from "../types/indicator_history";

export default function calculates_graham_max_price(indicators: IndicatorHistory[]): number {
  const earnings_per_share = indicators.find(indicator => indicator.indicator.toUpperCase() === 'LPA')?.values[0].value ?? 0;
  const book_value_per_share = indicators.find(indicator => indicator.indicator.toUpperCase() === 'VPA')?.values[0].value ?? 0;

  if (earnings_per_share < 0 || book_value_per_share < 0) {
    return 0;
  }

  return Math.sqrt(22.5 * earnings_per_share * book_value_per_share);
}