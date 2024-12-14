import Dividend from "../types/dividend";

export default function calculates_bazin_max_price(dividends_history: Dividend[]): number {
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